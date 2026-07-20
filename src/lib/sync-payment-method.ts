import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { getServerEnv } from "@/lib/env";

const execFileAsync = promisify(execFile);

export type SyncPaymentMethodResult = {
  external_customer_id: string;
  provider_customer_id: string;
  payment_method_id: string;
  lago_payment_method_id?: string;
  invoice_payment_statuses: Array<{
    id: string;
    number: string | null;
    payment_status: string;
    total_amount_cents: number;
  }>;
};

function lagoRepoRoot() {
  return (
    process.env.LAGO_REPO_ROOT ??
    path.resolve(process.cwd(), "../..")
  );
}

export async function syncStripePaymentMethod(input: {
  externalCustomerId: string;
  checkoutSessionId?: string | null;
}): Promise<SyncPaymentMethodResult> {
  const repoRoot = lagoRepoRoot();
  const scriptPath = path.join(
    process.cwd(),
    "scripts/sync-stripe-payment-method.rb",
  );

  const env = {
    ...process.env,
    EXTERNAL_CUSTOMER_ID: input.externalCustomerId,
    CHECKOUT_SESSION_ID: input.checkoutSessionId ?? "",
  };

  // Copy script into the running API container and execute it with Lago's Stripe credentials.
  const copy = await execFileAsync(
    "docker",
    ["compose", "cp", scriptPath, "api:/tmp/sync-stripe-payment-method.rb"],
    { cwd: repoRoot, env, maxBuffer: 2_000_000 },
  ).catch((error) => {
    throw new Error(
      `Unable to copy Stripe sync script into Lago API container: ${error instanceof Error ? error.message : String(error)}`,
    );
  });

  void copy;

  const { stdout, stderr } = await execFileAsync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "-e",
      `EXTERNAL_CUSTOMER_ID=${input.externalCustomerId}`,
      "-e",
      `CHECKOUT_SESSION_ID=${input.checkoutSessionId ?? ""}`,
      "api",
      "bundle",
      "exec",
      "rails",
      "runner",
      "/tmp/sync-stripe-payment-method.rb",
    ],
    { cwd: repoRoot, env, maxBuffer: 2_000_000 },
  ).catch((error: Error & { stdout?: string; stderr?: string }) => {
    const details = [error.stdout, error.stderr, error.message]
      .filter(Boolean)
      .join("\n");
    throw new Error(`Unable to sync Stripe payment method into Lago:\n${details}`);
  });

  const jsonLine = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse()
    .find((line) => line.startsWith("{"));

  if (!jsonLine) {
    throw new Error(
      `Stripe sync did not return JSON. stdout=${stdout} stderr=${stderr}`,
    );
  }

  return JSON.parse(jsonLine) as SyncPaymentMethodResult;
}

export function assertLocalLagoAvailable() {
  // Touch env to fail early if misconfigured.
  getServerEnv();
}
