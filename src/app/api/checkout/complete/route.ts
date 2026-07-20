import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { PLANS } from "@/lib/billing-config";
import {
  createSubscription,
  createSubscriptionWithoutAuthorization,
  ensureCustomerInvoicesPaid,
  getCustomer,
  getCustomerPortalUrl,
  listCustomerSubscriptions,
  listPaymentMethods,
  LagoApiError,
} from "@/lib/lago";
import { clearCheckoutSession, getCheckoutSession } from "@/lib/session";
import { syncStripePaymentMethod } from "@/lib/sync-payment-method";

function formatLagoError(error: LagoApiError) {
  const details = error.details as
    | { error_details?: unknown; message?: string }
    | undefined;

  const parts = [
    details?.message ?? error.message,
    error.code ? `(${error.code})` : "",
    details?.error_details ? JSON.stringify(details.error_details) : "",
  ];

  return parts.filter(Boolean).join(" ");
}

export async function POST(request: Request) {
  try {
    const session = await getCheckoutSession();
    if (!session) {
      return NextResponse.json(
        { error: "Checkout session expired. Please start again." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const checkoutSessionId =
      typeof body.checkoutSessionId === "string" ? body.checkoutSessionId : null;

    await getCustomer(session.externalCustomerId);

    // 1) Link the Stripe card to the Lago/Stripe customer and charge pending invoices.
    const syncResult = await syncStripePaymentMethod({
      externalCustomerId: session.externalCustomerId,
      checkoutSessionId,
    });

    const paymentMethods = await listPaymentMethods(session.externalCustomerId);
    if (paymentMethods.payment_methods.length === 0) {
      return NextResponse.json(
        {
          error:
            "Card was registered in Stripe but could not be linked in Lago. Please try again.",
        },
        { status: 400 },
      );
    }

    // 2) Create the subscription once the payment method is linked.
    const existing = await listCustomerSubscriptions(session.externalCustomerId).catch(
      () => ({ subscriptions: [] }),
    );
    const existingActive = existing.subscriptions.find(
      (subscription) =>
        subscription.status === "active" || subscription.status === "pending",
    );

    let subscription = existingActive;
    let authorizationUsed = false;

    if (!subscription) {
      const plan = PLANS[session.planKey];
      const externalSubscriptionId = `sub_${randomUUID()}`;

      try {
        const response = await createSubscription({
          externalCustomerId: session.externalCustomerId,
          planCode: session.planCode,
          externalSubscriptionId,
          authorizeAmountCents: plan.amountCents,
        });
        subscription = response.subscription;
        authorizationUsed = true;
      } catch (error) {
        if (
          error instanceof LagoApiError &&
          (error.status === 403 ||
            error.code === "feature_not_available" ||
            error.code === "stripe_required")
        ) {
          const response = await createSubscriptionWithoutAuthorization({
            externalCustomerId: session.externalCustomerId,
            planCode: session.planCode,
            externalSubscriptionId,
          });
          subscription = response.subscription;
        } else {
          throw error;
        }
      }
    }

    // 3) Ensure the generated invoice is charged and marked as paid.
    const invoices = await ensureCustomerInvoicesPaid(session.externalCustomerId);

    const portal = await getCustomerPortalUrl(session.externalCustomerId);
    await clearCheckoutSession();

    return NextResponse.json({
      subscription,
      authorizationUsed,
      syncResult,
      invoices,
      portalUrl: portal.customer.portal_url,
      redirectTo: portal.customer.portal_url,
    });
  } catch (error) {
    const message =
      error instanceof LagoApiError
        ? formatLagoError(error)
        : error instanceof Error
          ? error.message
          : "Unable to complete checkout.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
