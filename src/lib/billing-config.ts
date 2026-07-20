export const PLANS = {
  standard: {
    code: "standard_plan",
    name: "Standard",
    amountCents: 2000,
    description: "Model Easy and Medium included",
    models: ["easy", "medium"] as const,
    allowancePerModel: 1_000_000,
  },
  premium: {
    code: "premium_plan",
    name: "Premium",
    amountCents: 5000,
    description: "Model Easy, Medium and Pro included",
    models: ["easy", "medium", "pro"] as const,
    allowancePerModel: 5_000_000,
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type ModelKey = "easy" | "medium" | "pro";

export const MODELS: Record<
  ModelKey,
  { label: string; metricCode: string; unitPriceEur: number }
> = {
  easy: {
    label: "Model Easy",
    metricCode: "easy_tokens",
    unitPriceEur: 0.000001,
  },
  medium: {
    label: "Model Medium",
    metricCode: "medium_tokens",
    unitPriceEur: 0.000002,
  },
  pro: {
    label: "Model Pro",
    metricCode: "pro_tokens",
    unitPriceEur: 0.000003,
  },
};

export function getPlanByCode(planCode: string) {
  return Object.values(PLANS).find((plan) => plan.code === planCode) ?? null;
}

export function getPlanKeyByCode(planCode: string): PlanKey | null {
  const entry = Object.entries(PLANS).find(([, plan]) => plan.code === planCode);
  return entry ? (entry[0] as PlanKey) : null;
}

export function isModelAllowedForPlan(planKey: PlanKey, model: ModelKey) {
  return (PLANS[planKey].models as readonly ModelKey[]).includes(model);
}

export function formatEuro(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}
