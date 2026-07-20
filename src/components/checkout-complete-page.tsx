"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";

export function CheckoutCompletePage() {
  const searchParams = useSearchParams();
  const checkoutSessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState(
    "Linking your card, creating the subscription, and charging the invoice...",
  );

  useEffect(() => {
    async function completeCheckout() {
      try {
        const response = await fetch("/api/checkout/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutSessionId }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to complete checkout.");
        }

        const destination = payload.portalUrl ?? payload.redirectTo;
        if (!destination) {
          throw new Error("Subscription created, but no customer portal URL was returned.");
        }

        window.location.href = destination;
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to complete checkout.",
        );
      }
    }

    void completeCheckout();
  }, [checkoutSessionId]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-xl flex-col justify-center px-6 py-16">
        <div className="rounded-2xl border border-lago-grey-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-lago-grey-700">
            Finalizing subscription
          </h1>
          <p className="mt-3 text-sm leading-6 text-lago-grey-600">{message}</p>

          {status === "error" && (
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-primary px-4 py-2 text-sm"
              >
                Try again
              </button>
              <Link
                href="/"
                className="rounded-xl border border-lago-grey-300 px-4 py-2 text-sm font-semibold text-lago-grey-700"
              >
                Back to pricing
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
