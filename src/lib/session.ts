import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { PlanKey } from "@/lib/billing-config";
import { getServerEnv } from "@/lib/env";

export const CHECKOUT_COOKIE = "ai_pricing_checkout";

export type CheckoutSession = {
  externalCustomerId: string;
  planKey: PlanKey;
  planCode: string;
  customerName: string;
  customerEmail: string;
};

function getSecretKey() {
  return new TextEncoder().encode(getServerEnv().sessionSecret);
}

export async function setCheckoutSession(session: CheckoutSession) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(CHECKOUT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
}

export async function getCheckoutSession(): Promise<CheckoutSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CHECKOUT_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as CheckoutSession;
  } catch {
    return null;
  }
}

export async function clearCheckoutSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CHECKOUT_COOKIE);
}
