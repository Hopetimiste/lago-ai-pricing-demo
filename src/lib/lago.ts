import { getServerEnv } from "@/lib/env";

export class LagoApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "LagoApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type LagoRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

export async function lagoRequest<T>(
  path: string,
  options: LagoRequestOptions = {},
): Promise<T> {
  const { lagoApiUrl, lagoApiKey } = getServerEnv();
  const response = await fetch(`${lagoApiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${lagoApiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new LagoApiError(
      payload.message ??
        payload.error ??
        `Lago request failed (${response.status})`,
      response.status,
      payload.code,
      payload,
    );
  }

  return payload as T;
}

export type CustomerPayload = {
  external_id: string;
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  customer_type: "individual" | "company";
  legal_name?: string;
  country: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  zipcode: string;
  billing_configuration: {
    payment_provider: "stripe";
    payment_provider_code: string;
    sync_with_provider: boolean;
    provider_payment_methods?: string[];
  };
};

export async function createCustomer(customer: CustomerPayload) {
  return lagoRequest<{ customer: Record<string, unknown> }>("/customers", {
    method: "POST",
    body: { customer },
  });
}

export async function getCustomer(externalId: string) {
  return lagoRequest<{ customer: Record<string, unknown> }>(
    `/customers/${encodeURIComponent(externalId)}`,
  );
}

export async function createCheckoutUrl(externalId: string) {
  return lagoRequest<{ customer: { checkout_url: string } }>(
    `/customers/${encodeURIComponent(externalId)}/checkout_url`,
    { method: "POST" },
  );
}

export async function listPaymentMethods(externalId: string) {
  return lagoRequest<{ payment_methods: Array<Record<string, unknown>> }>(
    `/customers/${encodeURIComponent(externalId)}/payment_methods`,
  );
}

export async function getCustomerPortalUrl(externalId: string) {
  return lagoRequest<{ customer: { portal_url: string } }>(
    `/customers/${encodeURIComponent(externalId)}/portal_url`,
  );
}

export async function createSubscription(input: {
  externalCustomerId: string;
  planCode: string;
  externalSubscriptionId: string;
  authorizeAmountCents: number;
}) {
  return lagoRequest<{ subscription: Record<string, unknown>; authorization?: unknown }>(
    "/subscriptions",
    {
      method: "POST",
      body: {
        authorization: {
          amount_cents: input.authorizeAmountCents,
          amount_currency: "EUR",
        },
        subscription: {
          external_customer_id: input.externalCustomerId,
          plan_code: input.planCode,
          external_id: input.externalSubscriptionId,
          billing_time: "anniversary",
        },
      },
    },
  );
}

export async function createSubscriptionWithoutAuthorization(input: {
  externalCustomerId: string;
  planCode: string;
  externalSubscriptionId: string;
}) {
  return lagoRequest<{ subscription: Record<string, unknown> }>("/subscriptions", {
    method: "POST",
    body: {
      subscription: {
        external_customer_id: input.externalCustomerId,
        plan_code: input.planCode,
        external_id: input.externalSubscriptionId,
        billing_time: "anniversary",
      },
    },
  });
}

export async function ingestEvent(input: {
  transactionId: string;
  metricCode: string;
  externalSubscriptionId: string;
  tokens: number;
}) {
  return lagoRequest<{ event: Record<string, unknown> }>("/events", {
    method: "POST",
    body: {
      event: {
        transaction_id: input.transactionId,
        code: input.metricCode,
        external_subscription_id: input.externalSubscriptionId,
        properties: {
          tokens: input.tokens,
        },
      },
    },
  });
}

export async function listCustomerInvoices(externalId: string) {
  return lagoRequest<{ invoices: Array<Record<string, unknown>> }>(
    `/customers/${encodeURIComponent(externalId)}/invoices`,
  );
}

export async function retryInvoicePayment(invoiceId: string) {
  return lagoRequest<unknown>(`/invoices/${encodeURIComponent(invoiceId)}/retry_payment`, {
    method: "POST",
    body: {},
  });
}

export async function getInvoice(invoiceId: string) {
  return lagoRequest<{ invoice: Record<string, unknown> }>(
    `/invoices/${encodeURIComponent(invoiceId)}`,
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureCustomerInvoicesPaid(
  externalCustomerId: string,
  options: { attempts?: number; delayMs?: number } = {},
) {
  const attempts = options.attempts ?? 12;
  const delayMs = options.delayMs ?? 1500;
  let invoices: Array<Record<string, unknown>> = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await listCustomerInvoices(externalCustomerId);
    invoices = response.invoices ?? [];

    if (invoices.length === 0) {
      await sleep(delayMs);
      continue;
    }

    const unpaid = invoices.filter((invoice) => {
      const paymentStatus = String(invoice.payment_status ?? "");
      return paymentStatus !== "succeeded";
    });

    if (unpaid.length === 0) {
      return invoices;
    }

    for (const invoice of unpaid) {
      const invoiceId = String(invoice.lago_id ?? "");
      if (!invoiceId) continue;

      try {
        await retryInvoicePayment(invoiceId);
      } catch {
        // Retry loop will poll again.
      }
    }

    await sleep(delayMs);
  }

  const stillUnpaid = invoices.filter(
    (invoice) => String(invoice.payment_status ?? "") !== "succeeded",
  );

  if (stillUnpaid.length > 0) {
    throw new Error(
      `Invoice payment did not succeed: ${stillUnpaid
        .map((invoice) => `${invoice.number ?? invoice.lago_id}=${invoice.payment_status}`)
        .join(", ")}`,
    );
  }

  return invoices;
}

export async function listCustomerSubscriptions(externalId: string) {
  return lagoRequest<{ subscriptions: Array<Record<string, unknown>> }>(
    `/customers/${encodeURIComponent(externalId)}/subscriptions`,
  );
}

export async function getCurrentUsage(externalId: string) {
  return lagoRequest<{ customer_usage: Record<string, unknown> }>(
    `/customers/${encodeURIComponent(externalId)}/current_usage`,
  );
}

export async function upsertBillableMetric(metric: {
  name: string;
  code: string;
  description: string;
  aggregation_type: "sum_agg";
  field_name: string;
}) {
  try {
    return await lagoRequest<{ billable_metric: Record<string, unknown> }>(
      "/billable_metrics",
      { method: "POST", body: { billable_metric: metric } },
    );
  } catch (error) {
    if (error instanceof LagoApiError && error.status === 422) {
      return lagoRequest<{ billable_metric: Record<string, unknown> }>(
        `/billable_metrics/${metric.code}`,
        { method: "PUT", body: { billable_metric: metric } },
      );
    }

    throw error;
  }
}

export async function upsertPlan(plan: Record<string, unknown>) {
  const code = plan.code as string;

  try {
    return await lagoRequest<{ plan: Record<string, unknown> }>("/plans", {
      method: "POST",
      body: { plan },
    });
  } catch (error) {
    if (error instanceof LagoApiError && (error.status === 422 || error.status === 409)) {
      return lagoRequest<{ plan: Record<string, unknown> }>(`/plans/${code}`, {
        method: "PUT",
        body: { plan },
      });
    }

    throw error;
  }
}
