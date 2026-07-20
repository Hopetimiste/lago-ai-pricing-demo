import { MODELS, PLANS } from "./billing-config.mjs";
import { upsertBillableMetric, upsertPlan } from "./lago-setup-client.mjs";

function chargeProperties(unitPriceEur, freeUnits) {
  return {
    package_size: 1,
    amount: String(unitPriceEur),
    free_units: freeUnits,
  };
}

async function ensureMetric(modelKey) {
  const model = MODELS[modelKey];
  const response = await upsertBillableMetric({
    name: model.label,
    code: model.metricCode,
    description: `${model.label} token consumption`,
    aggregation_type: "sum_agg",
    field_name: "tokens",
  });

  return response.billable_metric.lago_id;
}

function buildPlan(planKey, metricIds) {
  const plan = PLANS[planKey];
  const charges = plan.models.map((modelKey) => ({
    billable_metric_id: metricIds[modelKey],
    charge_model: "package",
    invoice_display_name: MODELS[modelKey].label,
    properties: chargeProperties(
      MODELS[modelKey].unitPriceEur,
      plan.allowancePerModel,
    ),
  }));

  return {
    name: `${plan.name} plan`,
    code: plan.code,
    interval: "monthly",
    amount_cents: plan.amountCents,
    amount_currency: "EUR",
    pay_in_advance: true,
    description: plan.description,
    charges,
  };
}

async function main() {
  console.log("Setting up Lago billable metrics and plans...");

  const metricIds = {
    easy: await ensureMetric("easy"),
    medium: await ensureMetric("medium"),
    pro: await ensureMetric("pro"),
  };

  const standard = await upsertPlan(buildPlan("standard", metricIds));
  const premium = await upsertPlan(buildPlan("premium", metricIds));

  console.log("Created/updated plans:");
  console.log(`- ${standard.plan.code} (${standard.plan.lago_id})`);
  console.log(`- ${premium.plan.code} (${premium.plan.lago_id})`);
  console.log("Setup complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
