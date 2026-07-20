import { Suspense } from "react";
import { CustomerPortalPage } from "@/components/customer-portal-page";

export default function Page() {
  return (
    <Suspense fallback={<main className="px-6 py-16">Loading customer portal...</main>}>
      <CustomerPortalPage />
    </Suspense>
  );
}
