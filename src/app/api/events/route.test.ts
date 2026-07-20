import { describe, expect, it } from "vitest";
import { getPlanKeyByCode, isModelAllowedForPlan } from "@/lib/billing-config";

describe("event authorization helpers", () => {
  it("rejects pro usage on the standard plan", () => {
    const planKey = getPlanKeyByCode("standard_plan");
    expect(planKey).toBe("standard");
    expect(isModelAllowedForPlan(planKey!, "pro")).toBe(false);
  });

  it("accepts medium usage on the premium plan", () => {
    const planKey = getPlanKeyByCode("premium_plan");
    expect(planKey).toBe("premium");
    expect(isModelAllowedForPlan(planKey!, "medium")).toBe(true);
  });
});
