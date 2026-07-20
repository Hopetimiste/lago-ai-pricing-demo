import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  getPlanKeyByCode,
  isModelAllowedForPlan,
  MODELS,
  type ModelKey,
} from "@/lib/billing-config";
import { ingestEvent, LagoApiError } from "@/lib/lago";

type EventBody = {
  externalCustomerId: string;
  externalSubscriptionId: string;
  planCode: string;
  model: ModelKey;
  tokens: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EventBody;
    const planKey = getPlanKeyByCode(body.planCode);

    if (!planKey) {
      return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
    }

    if (!isModelAllowedForPlan(planKey, body.model)) {
      return NextResponse.json(
        { error: `${MODELS[body.model].label} is not included in your plan.` },
        { status: 403 },
      );
    }

    if (!Number.isInteger(body.tokens) || body.tokens <= 0) {
      return NextResponse.json(
        { error: "Tokens must be a positive integer." },
        { status: 400 },
      );
    }

    const event = await ingestEvent({
      transactionId: `evt_${randomUUID()}`,
      metricCode: MODELS[body.model].metricCode,
      externalSubscriptionId: body.externalSubscriptionId,
      tokens: body.tokens,
    });

    return NextResponse.json({ event });
  } catch (error) {
    const message =
      error instanceof LagoApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to ingest usage event.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
