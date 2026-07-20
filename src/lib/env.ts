function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getServerEnv() {
  return {
    lagoApiUrl: process.env.LAGO_API_URL ?? "http://localhost:3000/api/v1",
    lagoApiKey: required("LAGO_API_KEY", process.env.LAGO_API_KEY),
    paymentProviderCode:
      process.env.LAGO_PAYMENT_PROVIDER_CODE ?? "stripe_default",
    appUrl: process.env.APP_URL ?? "http://localhost:3001",
    sessionSecret: required(
      "SESSION_SECRET",
      process.env.SESSION_SECRET ?? process.env.SECRET_KEY_BASE,
    ),
  };
}
