import { Suspense } from "react";
import { CheckoutCompletePage } from "@/components/checkout-complete-page";

export default function Page() {
  return (
    <Suspense fallback={<main className="px-6 py-16">Loading...</main>}>
      <CheckoutCompletePage />
    </Suspense>
  );
}
