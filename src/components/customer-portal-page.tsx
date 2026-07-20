"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

export function CustomerPortalPage() {
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get("customer") ?? "";
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [loading, setLoading] = useState(Boolean(initialCustomerId));
  const [error, setError] = useState<string | null>(null);

  async function openPortal(externalCustomerId: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/portal?customer=${encodeURIComponent(externalCustomerId.trim())}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to open customer portal.");
      }

      window.location.href = payload.portalUrl;
    } catch (openError) {
      setLoading(false);
      setError(
        openError instanceof Error
          ? openError.message
          : "Unable to open customer portal.",
      );
    }
  }

  useEffect(() => {
    if (initialCustomerId) {
      void openPortal(initialCustomerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomerId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await openPortal(customerId);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader customerId={initialCustomerId || null} />
      <main className="mx-auto max-w-xl px-6 py-16">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-lago-grey-600">
            Customer portal
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-lago-grey-700">
            Open your Lago portal
          </h1>
          <p className="mt-2 text-sm leading-6 text-lago-grey-600">
            Enter your external customer id to access invoices, subscriptions, and
            payment methods in the Lago customer portal.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-lago-grey-200 bg-white p-6 shadow-sm"
        >
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-lago-grey-700">
              Lago external customer id
            </span>
            <input
              required
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              placeholder="cust_..."
              className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-grey-600"
            />
          </label>

          <button type="submit" disabled={loading} className="btn-primary px-4 py-3 text-sm">
            {loading ? "Opening portal..." : "Open customer portal"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-lg bg-lago-red-100 px-3 py-2 text-sm text-lago-red-600">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
