import { describe, expect, it } from "vitest";
import {
  getPlanByCode,
  getPlanKeyByCode,
  isModelAllowedForPlan,
  MODELS,
  PLANS,
} from "@/lib/billing-config";

describe("billing plan rules", () => {
  it("maps plan codes back to plan keys", () => {
    expect(getPlanKeyByCode(PLANS.standard.code)).toBe("standard");
    expect(getPlanKeyByCode(PLANS.premium.code)).toBe("premium");
    expect(getPlanByCode("unknown_plan")).toBeNull();
  });

  it("allows only included models per plan", () => {
    expect(isModelAllowedForPlan("standard", "easy")).toBe(true);
    expect(isModelAllowedForPlan("standard", "medium")).toBe(true);
    expect(isModelAllowedForPlan("standard", "pro")).toBe(false);
    expect(isModelAllowedForPlan("premium", "pro")).toBe(true);
  });

  it("defines per-model allowances and prices", () => {
    expect(PLANS.standard.allowancePerModel).toBe(1_000_000);
    expect(PLANS.premium.allowancePerModel).toBe(5_000_000);
    expect(MODELS.pro.unitPriceEur).toBe(0.000003);
  });
});
