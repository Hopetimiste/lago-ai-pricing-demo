"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  getPlanByCode,
  MODELS,
  type ModelKey,
} from "@/lib/billing-config";
import { SiteHeader } from "@/components/site-header";

type Subscription = {
  external_id?: string;
  plan_code?: string;
  status?: string;
  name?: string;
};

export function UsageSimulatorPage() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get("customer") ?? "";

  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [customerInput, setCustomerInput] = useState(initialCustomerId);
  const [customerName, setCustomerName] = useState("");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState("");
  const [model, setModel] = useState<ModelKey>("easy");
  const [tokens, setTokens] = useState("10000");
  const [loading, setLoading] = useState(Boolean(initialCustomerId));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<Record<string, unknown> | null>(null);

  const selectedSubscription = useMemo(
    () =>
      subscriptions.find((item) => item.external_id === selectedSubscriptionId) ??
      null,
    [subscriptions, selectedSubscriptionId],
  );

  const plan = useMemo(
    () => getPlanByCode(String(selectedSubscription?.plan_code ?? "")),
    [selectedSubscription],
  );

  const allowedModels = useMemo<ModelKey[]>(
    () => [...(plan?.models ?? [])],
    [plan],
  );

  const loadCustomer = useCallback(async (externalCustomerId: string) => {
    if (!externalCustomerId.trim()) {
      setError("Enter a Lago external customer id.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setLastEvent(null);

    try {
      const response = await fetch(
        `/api/usage?customer=${encodeURIComponent(externalCustomerId.trim())}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load customer.");
      }

      const customer = payload.customer as Record<string, unknown>;
      const nextSubscriptions =
        (customer.subscriptions as Subscription[] | undefined) ?? [];
      const active =
        nextSubscriptions.find((item) => item.status === "active") ??
        nextSubscriptions[0] ??
        null;

      setCustomerId(externalCustomerId.trim());
      setCustomerName(String(customer.name ?? customer.external_id ?? externalCustomerId));
      setSubscriptions(nextSubscriptions);
      setSelectedSubscriptionId(String(active?.external_id ?? ""));

      if (nextSubscriptions.length === 0) {
        setError("This customer has no subscriptions yet.");
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load customer.",
      );
      setSubscriptions([]);
      setSelectedSubscriptionId("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCustomerId) {
      void loadCustomer(initialCustomerId);
    }
  }, [initialCustomerId, loadCustomer]);

  useEffect(() => {
    if (allowedModels.length > 0 && !allowedModels.includes(model)) {
      setModel(allowedModels[0]);
    }
  }, [allowedModels, model]);

  async function onLoadCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadCustomer(customerInput);
  }

  async function onSubmitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    if (!selectedSubscription?.external_id || !selectedSubscription.plan_code) {
      setError("Select a subscription first.");
      setSubmitting(false);
      return;
    }

    const tokenAmount = Number(tokens);
    if (!Number.isInteger(tokenAmount) || tokenAmount <= 0) {
      setError("Tokens must be a positive integer.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalCustomerId: customerId,
          externalSubscriptionId: selectedSubscription.external_id,
          planCode: selectedSubscription.plan_code,
          model,
          tokens: tokenAmount,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to ingest usage event.");
      }

      setLastEvent(payload.event ?? payload);
      setMessage(
        `Ingested ${tokenAmount.toLocaleString("fr-FR")} tokens for ${MODELS[model].label} on subscription ${selectedSubscription.external_id}.`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to ingest usage event.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader customerId={customerId || null} />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-lago-purple-600">
            Usage simulation
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-lago-grey-700">
            Ingest a metered event
          </h1>
          <p className="mt-2 text-sm leading-6 text-lago-grey-600">
            Choose a customer subscription and model, then push a token usage event
            into Lago.
          </p>
        </header>

        <form
          onSubmit={onLoadCustomer}
          className="mt-8 space-y-4 rounded-2xl border border-lago-grey-200 bg-white p-6 shadow-sm"
        >
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-lago-grey-700">
              Lago external customer id
            </span>
            <input
              required
              value={customerInput}
              onChange={(event) => setCustomerInput(event.target.value)}
              placeholder="cust_..."
              className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-4 py-2 text-sm"
          >
            {loading ? "Loading..." : "Load subscriptions"}
          </button>
        </form>

        {customerId && (
          <section className="mt-6 rounded-2xl border border-lago-grey-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-lago-grey-700">{customerName}</h2>
                <p className="mt-1 text-sm text-lago-grey-500">{customerId}</p>
              </div>
              <a
                href={`/portal?customer=${encodeURIComponent(customerId)}`}
                className="text-sm font-medium text-lago-grey-700 hover:underline"
              >
                Open customer portal
              </a>
            </div>

            <form onSubmit={onSubmitEvent} className="mt-6 space-y-4">
              <label className="block space-y-1 text-sm">
                <span className="font-medium text-lago-grey-700">Subscription</span>
                <select
                  required
                  value={selectedSubscriptionId}
                  onChange={(event) => setSelectedSubscriptionId(event.target.value)}
                  className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
                >
                  <option value="" disabled>
                    Select a subscription
                  </option>
                  {subscriptions.map((subscription) => (
                    <option
                      key={subscription.external_id}
                      value={subscription.external_id}
                    >
                      {subscription.external_id} · {subscription.plan_code} ·{" "}
                      {subscription.status}
                    </option>
                  ))}
                </select>
              </label>

              {plan && (
                <p className="rounded-lg bg-lago-purple-100 px-3 py-2 text-sm text-lago-purple-700">
                  {plan.name} plan · included models:{" "}
                  {plan.models.map((key) => MODELS[key].label).join(", ")} ·{" "}
                  {plan.allowancePerModel.toLocaleString("fr-FR")} free tokens per model
                </p>
              )}

              <label className="block space-y-1 text-sm">
                <span className="font-medium text-lago-grey-700">Model</span>
                <select
                  required
                  value={model}
                  onChange={(event) => setModel(event.target.value as ModelKey)}
                  disabled={allowedModels.length === 0}
                  className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400 disabled:bg-lago-grey-100"
                >
                  {allowedModels.map((modelKey) => (
                    <option key={modelKey} value={modelKey}>
                      {MODELS[modelKey].label} ({MODELS[modelKey].metricCode})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-medium text-lago-grey-700">Tokens to ingest</span>
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  value={tokens}
                  onChange={(event) => setTokens(event.target.value)}
                  className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
                />
              </label>

              <button
                type="submit"
                disabled={submitting || !selectedSubscriptionId || allowedModels.length === 0}
                className="btn-primary px-4 py-3 text-sm"
              >
                {submitting ? "Sending event..." : "Ingest metered event"}
              </button>
            </form>
          </section>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-lago-red-100 px-3 py-2 text-sm text-lago-red-600">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-lg bg-lago-green-100 px-3 py-2 text-sm text-lago-green-600">
            {message}
          </p>
        )}

        {lastEvent && (
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-lago-grey-700 p-4 text-xs text-white">
            {JSON.stringify(lastEvent, null, 2)}
          </pre>
        )}
      </main>
    </div>
  );
}
