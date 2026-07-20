import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout-form";

export default function Page() {
  return (
    <Suspense fallback={<main className="px-6 py-16">Loading checkout...</main>}>
      <CheckoutForm />
    </Suspense>
  );
}
