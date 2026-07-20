import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PLANS, type PlanKey } from "@/lib/billing-config";
import { getServerEnv } from "@/lib/env";
import {
  createCheckoutUrl,
  createCustomer,
  LagoApiError,
} from "@/lib/lago";
import { setCheckoutSession } from "@/lib/session";

type CheckoutStartBody = {
  planKey: PlanKey;
  customerType: "individual" | "company";
  firstname: string;
  lastname: string;
  email: string;
  legalName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  zipcode: string;
  country: string;
};

function validateBody(body: CheckoutStartBody) {
  if (!PLANS[body.planKey]) {
    throw new Error("Invalid plan selected.");
  }

  if (!body.firstname?.trim() || !body.lastname?.trim() || !body.email?.trim()) {
    throw new Error("First name, last name, and email are required.");
  }

  if (!body.addressLine1?.trim() || !body.city?.trim() || !body.zipcode?.trim() || !body.country?.trim()) {
    throw new Error("A complete billing address is required.");
  }

  if (body.customerType === "company" && !body.legalName?.trim()) {
    throw new Error("Company legal name is required.");
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutStartBody;
    validateBody(body);

    const plan = PLANS[body.planKey];
    const { paymentProviderCode, appUrl } = getServerEnv();
    const externalCustomerId = `cust_${randomUUID()}`;
    const firstname = body.firstname.trim();
    const lastname = body.lastname.trim();
    const fullName = `${firstname} ${lastname}`;

    await createCustomer({
      external_id: externalCustomerId,
      name: fullName,
      firstname,
      lastname,
      email: body.email.trim(),
      customer_type: body.customerType,
      legal_name: body.legalName?.trim() || fullName,
      country: body.country.trim(),
      address_line1: body.addressLine1.trim(),
      address_line2: body.addressLine2?.trim(),
      city: body.city.trim(),
      state: body.state?.trim(),
      zipcode: body.zipcode.trim(),
      billing_configuration: {
        payment_provider: "stripe",
        payment_provider_code: paymentProviderCode,
        sync_with_provider: true,
        provider_payment_methods: ["card"],
      },
    });

    const checkout = await createCheckoutUrl(externalCustomerId);

    await setCheckoutSession({
      externalCustomerId,
      planKey: body.planKey,
      planCode: plan.code,
      customerName: fullName,
      customerEmail: body.email.trim(),
    });

    return NextResponse.json({
      externalCustomerId,
      checkoutUrl: checkout.customer.checkout_url,
      completeUrl: `${appUrl}/checkout/complete`,
    });
  } catch (error) {
    const message =
      error instanceof LagoApiError
        ? `${error.message}${error.code ? ` (${error.code})` : ""}`
        : error instanceof Error
          ? error.message
          : "Unable to start checkout.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
