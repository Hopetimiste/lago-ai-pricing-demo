import { NextResponse } from "next/server";
import { listCustomerInvoices, LagoApiError } from "@/lib/lago";

export async function GET(request: Request) {
  try {
    const externalCustomerId = new URL(request.url).searchParams.get("customer");
    if (!externalCustomerId) {
      return NextResponse.json({ error: "Missing customer id." }, { status: 400 });
    }

    const response = await listCustomerInvoices(externalCustomerId);
    return NextResponse.json({ invoices: response.invoices ?? [] });
  } catch (error) {
    const message =
      error instanceof LagoApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to fetch invoices.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
