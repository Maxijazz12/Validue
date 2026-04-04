import Link from "next/link";

export const metadata = {
  title: "Support – Validue",
};

export default function SupportPage() {
  return (
    <div className="max-w-[600px] mx-auto py-[40px] px-[16px]">
      <h1 className="text-[28px] font-semibold tracking-tight text-text-primary mb-[8px]">
        Support
      </h1>
      <p className="text-[15px] text-text-muted mb-[32px] leading-relaxed">
        Need help? We&apos;re here for you.
      </p>

      {/* Contact */}
      <div className="bg-surface rounded-[20px] md:rounded-[28px] p-[20px] md:p-[28px] shadow-card mb-[24px]">
        <h2 className="text-[18px] font-medium tracking-tight text-text-primary mb-[10px]">
          Contact us
        </h2>
        <p className="text-[14px] text-text-muted leading-relaxed mb-[16px]">
          For questions, issues, or feedback — email us and we&apos;ll get back
          to you as soon as we can.
        </p>
        <a
          href="mailto:support@validue.com"
          className="inline-flex items-center justify-center px-[24px] py-[12px] rounded-full text-[13px] font-bold tracking-wide bg-accent text-white hover:opacity-90 transition-opacity duration-200 no-underline"
        >
          support@validue.com
        </a>
      </div>

      {/* FAQ link */}
      <div className="bg-surface rounded-[20px] md:rounded-[28px] p-[20px] md:p-[28px] shadow-card">
        <h2 className="text-[18px] font-medium tracking-tight text-text-primary mb-[10px]">
          FAQ
        </h2>
        <p className="text-[14px] text-text-muted leading-relaxed mb-[16px]">
          Common questions about pricing, campaigns, payouts, and more.
        </p>
        <Link
          href="/pricing#faq"
          className="inline-flex items-center text-[13px] font-semibold text-accent hover:opacity-80 transition-opacity no-underline"
        >
          View FAQ on pricing page
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-[6px]"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
