import Link from "next/link";

export default function CtaBanner() {
  return (
    <section className="text-center py-8">
      <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-[-0.02em] leading-[1.1] text-white">
        Your next build decision<br />
        <span className="text-white/40 italic font-heading font-normal">
          shouldn&apos;t be a guess
        </span>
      </h2>
      <p className="mt-6 text-[17px] text-white/50 max-w-[420px] mx-auto leading-[1.7]">
        Start with a raw idea. Leave with a Decision Brief that tells you exactly what to do next.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4 max-md:flex-col">
        <Link
          href="/auth/signup"
          className="inline-flex items-center px-8 py-3.5 rounded-full text-[15px] font-medium text-text-primary bg-white hover:bg-white/90 transition-all no-underline shadow-[0_4px_12px_rgba(255,255,255,0.1)] hover:shadow-[0_8px_24px_rgba(255,255,255,0.15)] hover:-translate-y-[1px]"
        >
          Get your first brief
          <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
        <Link
          href="/#examples"
          className="inline-flex items-center px-6 py-3.5 rounded-full text-[15px] text-white/50 hover:text-white transition-colors no-underline"
        >
          See example briefs
        </Link>
      </div>
    </section>
  );
}
