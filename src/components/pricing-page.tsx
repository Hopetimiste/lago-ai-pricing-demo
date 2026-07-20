"use client";

import Link from "next/link";
import { formatEuro, MODELS, PLANS, type PlanKey } from "@/lib/billing-config";
import { SiteHeader } from "@/components/site-header";

function PlanCard({ planKey }: { planKey: PlanKey }) {
  const plan = PLANS[planKey];

  return (
    <article className="flex h-full flex-col rounded-2xl border border-lago-grey-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-medium uppercase tracking-wide text-lago-purple-600">
          {plan.name}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-lago-grey-700">
          {formatEuro(plan.amountCents / 100)}
          <span className="text-base font-normal text-lago-grey-500">/month</span>
        </h2>
        <p className="mt-2 text-sm text-lago-grey-600">{plan.description}</p>
      </div>

      <ul className="mb-6 space-y-2 text-sm text-lago-grey-700">
        {plan.models.map((modelKey) => (
          <li key={modelKey} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lago-purple-500" />
            <span>
              {MODELS[modelKey].label}:{" "}
              {plan.allowancePerModel.toLocaleString("fr-FR")} tokens/month included, then{" "}
              {formatEuro(MODELS[modelKey].unitPriceEur)}/token
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={`/checkout?plan=${planKey}`}
        className="btn-primary mt-auto px-4 py-3 text-sm"
      >
        Choose {plan.name}
      </Link>
    </article>
  );
}

export function PricingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wide text-lago-purple-600">
            AI access pricing
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-lago-grey-700">
            Pick a plan, register your card, start billing usage
          </h1>
          <p className="mt-4 text-base leading-7 text-lago-grey-600">
            Each plan includes a monthly token allowance per model. Overage is billed
            automatically through Lago and Stripe.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <PlanCard planKey="standard" />
          <PlanCard planKey="premium" />
        </section>
      </main>
    </div>
  );
}
