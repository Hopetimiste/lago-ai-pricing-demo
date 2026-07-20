export const PLANS = {
  standard: {
    code: "standard_plan",
    name: "Standard",
    amountCents: 2000,
    description: "Model Easy and Medium included",
    models: ["easy", "medium"],
    allowancePerModel: 1_000_000,
  },
  premium: {
    code: "premium_plan",
    name: "Premium",
    amountCents: 5000,
    description: "Model Easy, Medium and Pro included",
    models: ["easy", "medium", "pro"],
    allowancePerModel: 5_000_000,
  },
};

export const MODELS = {
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
