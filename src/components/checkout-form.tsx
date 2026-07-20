"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { PLANS, type PlanKey } from "@/lib/billing-config";
import { SiteHeader } from "@/components/site-header";

const defaultCountry = "FR";

export function CheckoutForm() {
  const searchParams = useSearchParams();
  const planKey = (searchParams.get("plan") ?? "standard") as PlanKey;
  const plan = useMemo(() => PLANS[planKey] ?? PLANS.standard, [planKey]);

  const [customerType, setCustomerType] = useState<"individual" | "company">(
    "individual",
  );
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [legalName, setLegalName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [country, setCountry] = useState(defaultCountry);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey,
          customerType,
          firstname,
          lastname,
          email,
          legalName: customerType === "company" ? legalName : undefined,
          addressLine1,
          addressLine2,
          city,
          state,
          zipcode,
          country,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to start checkout.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to start checkout.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm font-medium text-lago-purple-600 hover:text-lago-purple-500">
          Back to pricing
        </Link>

        <header className="mt-6">
          <p className="text-sm font-medium uppercase tracking-wide text-lago-purple-600">
            Checkout
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-lago-grey-700">
            Subscribe to {plan.name}
          </h1>
          <p className="mt-2 text-sm text-lago-grey-600">
            Enter your details, register a card on Stripe, then we activate your
            subscription and open your customer portal.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-lago-grey-200 bg-white p-6 shadow-sm"
        >
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-lago-grey-700">Account type</legend>
            <label className="flex items-center gap-2 text-sm text-lago-grey-700">
              <input
                type="radio"
                name="customerType"
                checked={customerType === "individual"}
                onChange={() => setCustomerType("individual")}
              />
              Personal
            </label>
            <label className="flex items-center gap-2 text-sm text-lago-grey-700">
              <input
                type="radio"
                name="customerType"
                checked={customerType === "company"}
                onChange={() => setCustomerType("company")}
              />
              Company
            </label>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-lago-grey-700">First name</span>
              <input
                required
                value={firstname}
                onChange={(event) => setFirstname(event.target.value)}
                className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-lago-grey-700">Last name</span>
              <input
                required
                value={lastname}
                onChange={(event) => setLastname(event.target.value)}
                className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
              />
            </label>
          </div>

          {customerType === "company" && (
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-lago-grey-700">Company legal name</span>
              <input
                required
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
              />
            </label>
          )}

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-lago-grey-700">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-lago-grey-700">Address line 1</span>
            <input
              required
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-lago-grey-700">Address line 2</span>
            <input
              value={addressLine2}
              onChange={(event) => setAddressLine2(event.target.value)}
              className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-lago-grey-700">City</span>
              <input
                required
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-lago-grey-700">State / region</span>
              <input
                value={state}
                onChange={(event) => setState(event.target.value)}
                className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-lago-grey-700">Postal code</span>
              <input
                required
                value={zipcode}
                onChange={(event) => setZipcode(event.target.value)}
                className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-lago-grey-700">Country (ISO code)</span>
              <input
                required
                value={country}
                onChange={(event) => setCountry(event.target.value.toUpperCase())}
                className="w-full rounded-lg border border-lago-grey-300 px-3 py-2 outline-none focus:border-lago-purple-400"
              />
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-lago-red-100 px-3 py-2 text-sm text-lago-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full px-4 py-3 text-sm"
          >
            {loading ? "Creating customer..." : "Continue to Stripe"}
          </button>
        </form>
      </main>
    </div>
  );
}
