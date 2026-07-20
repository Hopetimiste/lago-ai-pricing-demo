import Link from "next/link";

export function SiteHeader({ customerId }: { customerId?: string | null }) {
  return (
    <header className="border-b border-lago-grey-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lago-logo.svg"
            alt="Lago"
            width={86}
            height={26}
            className="h-6 w-auto"
          />
          <span className="hidden text-sm font-semibold text-lago-grey-700 sm:inline">
            AI Pricing
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-lago-grey-600">
          <Link href="/" className="hover:text-lago-grey-700">
            Pricing
          </Link>
          <Link
            href={customerId ? `/usage?customer=${encodeURIComponent(customerId)}` : "/usage"}
            className="hover:text-lago-grey-700"
          >
            Simulate usage
          </Link>
          <Link
            href={customerId ? `/portal?customer=${encodeURIComponent(customerId)}` : "/portal"}
            className="hover:text-lago-grey-700"
          >
            Customer portal
          </Link>
        </nav>
      </div>
    </header>
  );
}
