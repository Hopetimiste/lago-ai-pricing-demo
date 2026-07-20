import { Suspense } from "react";
import { UsageSimulatorPage } from "@/components/usage-simulator-page";

export default function Page() {
  return (
    <Suspense fallback={<main className="px-6 py-16">Loading usage simulator...</main>}>
      <UsageSimulatorPage />
    </Suspense>
  );
}
