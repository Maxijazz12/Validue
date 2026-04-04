import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FBF9F7] px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#92400e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M16.2 7.8l-2.1 2.1" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
          <path d="M12 2c2.5 2.5 4 5.7 4 10s-1.5 7.5-4 10" />
          <path d="M12 2c-2.5 2.5-4 5.7-4 10s1.5 7.5 4 10" />
        </svg>
      </div>

      <h1 className="mb-2 text-xl font-bold text-[#1C1917]">Page not found</h1>

      <p className="mx-auto mb-8 max-w-sm text-sm text-[#78716c]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-[#1C1917] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Back to home
        </Link>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#78716c] underline underline-offset-2 transition-colors hover:text-[#1C1917]"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
