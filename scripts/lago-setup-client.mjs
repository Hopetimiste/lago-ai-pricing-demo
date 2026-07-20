import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

export class LagoApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "LagoApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getEnv() {
  return {
    lagoApiUrl: process.env.LAGO_API_URL ?? "http://localhost:3000/api/v1",
    lagoApiKey: required("LAGO_API_KEY", process.env.LAGO_API_KEY),
  };
}

export async function lagoRequest(path, options = {}) {
  const { lagoApiUrl, lagoApiKey } = getEnv();
  const response = await fetch(`${lagoApiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${lagoApiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new LagoApiError(
      payload.error ?? payload.message ?? `Lago request failed (${response.status})`,
      response.status,
      payload.code,
      payload,
    );
  }

  return payload;
}

export async function upsertBillableMetric(metric) {
  try {
    return await lagoRequest("/billable_metrics", {
      method: "POST",
      body: { billable_metric: metric },
    });
  } catch (error) {
    if (error instanceof LagoApiError && error.status === 422) {
      return lagoRequest(`/billable_metrics/${metric.code}`, {
        method: "PUT",
        body: { billable_metric: metric },
      });
    }

    throw error;
  }
}

export async function upsertPlan(plan) {
  try {
    return await lagoRequest("/plans", {
      method: "POST",
      body: { plan },
    });
  } catch (error) {
    if (error instanceof LagoApiError && (error.status === 422 || error.status === 409)) {
      return lagoRequest(`/plans/${plan.code}`, {
        method: "PUT",
        body: { plan },
      });
    }

    throw error;
  }
}
