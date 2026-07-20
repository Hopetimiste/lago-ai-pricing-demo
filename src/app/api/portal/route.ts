import { NextResponse } from "next/server";
import { getCustomerPortalUrl, LagoApiError } from "@/lib/lago";

export async function GET(request: Request) {
  try {
    const externalCustomerId = new URL(request.url).searchParams.get("customer");
    if (!externalCustomerId) {
      return NextResponse.json({ error: "Missing customer id." }, { status: 400 });
    }

    const portal = await getCustomerPortalUrl(externalCustomerId);
    return NextResponse.json({ portalUrl: portal.customer.portal_url });
  } catch (error) {
    const message =
      error instanceof LagoApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to fetch customer portal URL.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
