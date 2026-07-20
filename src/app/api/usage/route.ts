import { NextResponse } from "next/server";
import { getCurrentUsage, getCustomer, listCustomerSubscriptions, LagoApiError } from "@/lib/lago";

export async function GET(request: Request) {
  try {
    const externalCustomerId = new URL(request.url).searchParams.get("customer");
    if (!externalCustomerId) {
      return NextResponse.json({ error: "Missing customer id." }, { status: 400 });
    }

    const [customerResponse, usageResponse, subscriptionsResponse] = await Promise.all([
      getCustomer(externalCustomerId),
      getCurrentUsage(externalCustomerId).catch(() => ({ customer_usage: null })),
      listCustomerSubscriptions(externalCustomerId).catch(() => ({ subscriptions: [] })),
    ]);

    return NextResponse.json({
      customer: {
        ...customerResponse.customer,
        subscriptions: subscriptionsResponse.subscriptions ?? [],
      },
      usage: usageResponse.customer_usage,
    });
  } catch (error) {
    const message =
      error instanceof LagoApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to fetch customer usage.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
