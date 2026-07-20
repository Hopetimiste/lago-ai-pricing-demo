# frozen_string_literal: true

# Syncs the Stripe card onto the Lago customer and reprocesses pending invoices.
# Usage inside the api container:
#   EXTERNAL_CUSTOMER_ID=cust_xxx CHECKOUT_SESSION_ID=cs_xxx bundle exec rails runner /path/or/stdin

external_id = ENV.fetch("EXTERNAL_CUSTOMER_ID")
checkout_session_id = ENV["CHECKOUT_SESSION_ID"].presence

customer = Customer.find_by(external_id:)
raise "Customer not found: #{external_id}" unless customer

stripe_customer = customer.provider_customer
raise "No Stripe provider customer for #{external_id}" unless stripe_customer

api_key = stripe_customer.payment_provider.secret_key
payment_method_id = nil
payment_method_details = {}

if checkout_session_id.present?
  session = ::Stripe::Checkout::Session.retrieve(
    {id: checkout_session_id, expand: ["setup_intent", "setup_intent.payment_method"]},
    {api_key:}
  )

  setup_intent = session.setup_intent
  if setup_intent.is_a?(String)
    setup_intent = ::Stripe::SetupIntent.retrieve(
      {id: setup_intent, expand: ["payment_method"]},
      {api_key:}
    )
  end

  payment_method = setup_intent&.payment_method
  if payment_method.is_a?(String)
    payment_method_id = payment_method
    payment_method = ::Stripe::PaymentMethod.retrieve(payment_method_id, {api_key:})
  elsif payment_method
    payment_method_id = payment_method.id
  end
end

unless payment_method_id
  10.times do |attempt|
    payment_method_id = PaymentProviderCustomers::Stripe::RetrieveLatestPaymentMethodService
      .call!(provider_customer: stripe_customer)
      .payment_method_id
    break if payment_method_id.present?

    sleep 1.5 unless attempt == 9
  end
end

raise "No Stripe payment method found for customer #{external_id}" if payment_method_id.blank?

payment_method ||= ::Stripe::PaymentMethod.retrieve(payment_method_id, {api_key:})

# Ensure the card is attached and set as default on the Stripe customer.
if payment_method.customer.blank?
  ::Stripe::PaymentMethod.attach(
    payment_method_id,
    {customer: stripe_customer.provider_customer_id},
    {api_key:}
  )
end

::Stripe::Customer.update(
  stripe_customer.provider_customer_id,
  {invoice_settings: {default_payment_method: payment_method_id}},
  {api_key:}
)

card = payment_method.try(:card)
payment_method_details = PaymentMethods::CardDetails.new(
  type: payment_method.type,
  last4: card&.last4,
  brand: card&.display_brand,
  expiration_month: card&.exp_month,
  expiration_year: card&.exp_year,
  card_holder_name: nil,
  issuer: nil
).to_h

result = PaymentProviderCustomers::Stripe::UpdatePaymentMethodService.call!(
  stripe_customer:,
  payment_method_id:,
  payment_method_details:
)

# Charge any already-finalized pending invoices immediately (sync).
customer.invoices.payment_pending.where(status: "finalized").find_each do |invoice|
  begin
    Invoices::Payments::CreateService.call!(invoice:, payment_provider: :stripe)
  rescue => e
    warn "Invoice #{invoice.id} payment attempt failed: #{e.message}"
  end
end

payload = {
  external_customer_id: external_id,
  provider_customer_id: stripe_customer.provider_customer_id,
  payment_method_id:,
  lago_payment_method_id: result.payment_method&.id,
  invoice_payment_statuses: customer.invoices.order(created_at: :desc).limit(5).map { |invoice|
    {
      id: invoice.id,
      number: invoice.number,
      payment_status: invoice.payment_status,
      total_amount_cents: invoice.total_amount_cents
    }
  }
}

puts payload.to_json
