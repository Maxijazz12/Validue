import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Privacy Policy — Validue",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#1C1917] text-white min-h-screen">
        <div className="max-w-[720px] mx-auto px-[64px] max-md:px-[24px] pt-[120px] pb-[80px]">
          <span className="font-mono text-[11px] font-medium tracking-wide text-[#78716C] uppercase block mb-[8px]">
            Legal
          </span>
          <h1 className="text-[32px] font-medium tracking-tight mb-[8px]">Privacy Policy</h1>
          <p className="font-mono text-[11px] text-[#78716C] uppercase tracking-wide mb-[48px]">
            Effective: April 3, 2026
          </p>

          <div className="prose-legal">
            <Section title="1. Overview">
              <p>
                Validue Inc. (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the Validue
                platform. This Privacy Policy explains how we collect, use, share, and protect your
                personal information when you use our services.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <h3>Account Information</h3>
              <p>
                When you create an account, we collect your name, email address, and
                primary mode preference (founder-first or respondent-first). People
                who use the feedback side of the product may optionally provide
                interests, expertise, occupation, age range, and location to improve
                campaign matching.
              </p>
              <h3>Campaign & Response Data</h3>
              <p>
                We collect campaign descriptions submitted by founders and response content submitted
                by respondents. This includes text answers, timing metadata, and interaction patterns
                used for quality scoring.
              </p>
              <h3>Payment Information</h3>
              <p>
                Payment processing is handled by Stripe. We store Stripe customer IDs and Connect
                account IDs but do not store credit card numbers, bank account numbers, or other
                sensitive financial details on our servers.
              </p>
              <h3>Usage Data</h3>
              <p>
                We collect standard server logs, error reports (via Sentry), and platform interaction
                data to maintain and improve the service.
              </p>
            </Section>

            <Section title="3. How We Use Your Information">
              <ul>
                <li>Operating the platform: matching respondents to campaigns, scoring responses, generating Decision Briefs</li>
                <li>Processing payments and payouts via Stripe</li>
                <li>Computing reputation scores and quality metrics</li>
                <li>Detecting fraud, abuse, and policy violations</li>
                <li>Sending in-app notifications about your campaigns, responses, and earnings</li>
                <li>Improving our AI scoring and synthesis systems</li>
                <li>Providing customer support</li>
              </ul>
            </Section>

            <Section title="4. AI Processing">
              <p>
                Your campaign descriptions and response content are processed by AI systems
                (Anthropic Claude) to generate quality scores, feedback, and Decision Briefs.
                AI outputs are used within the platform and are not shared externally. We use
                AI providers that do not train on customer data.
              </p>
            </Section>

            <Section title="5. Information Sharing">
              <p>We share your information only in these circumstances:</p>
              <ul>
                <li><strong>With other users:</strong> Response content (anonymized) is shared with campaign creators. Campaign details are visible to matched respondents.</li>
                <li><strong>Service providers:</strong> Stripe (payments), Supabase (database hosting), Anthropic (AI processing), Sentry (error monitoring), Vercel (hosting).</li>
                <li><strong>Legal requirements:</strong> When required by law, court order, or to protect our rights and safety.</li>
              </ul>
              <p>We do not sell your personal information to third parties.</p>
            </Section>

            <Section title="6. Data Retention">
              <p>
                We retain your account data for as long as your account is active. Campaign and
                response data is retained to maintain platform integrity and historical records.
                Upon account deletion, your personal information is removed within 30 days.
                Anonymized, aggregated data may be retained indefinitely.
              </p>
            </Section>

            <Section title="7. Your Rights">
              <p>Depending on your jurisdiction, you may have the right to:</p>
              <ul>
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update inaccurate information via your settings page</li>
                <li><strong>Deletion:</strong> Delete your account and associated data via your settings page</li>
                <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
              </ul>
              <p>
                To exercise these rights, contact us at{" "}
                <a href="mailto:privacy@validue.com" className="text-[#D4A088] hover:text-white transition-colors">
                  privacy@validue.com
                </a>
              </p>
            </Section>

            <Section title="8. Data Security">
              <p>
                We implement appropriate technical and organizational measures to protect your data,
                including encryption in transit (TLS), database-level row-level security (RLS),
                rate limiting, and content moderation. No system is 100% secure, and we cannot
                guarantee absolute security.
              </p>
            </Section>

            <Section title="9. International Transfers">
              <p>
                Your data may be processed in the European Union (database hosted in EU-West-1)
                and the United States (hosting and AI providers). We ensure appropriate safeguards
                are in place for cross-border transfers.
              </p>
            </Section>

            <Section title="10. Children">
              <p>
                The Platform is not intended for users under 18. We do not knowingly collect
                information from minors. If we learn we have collected data from a user under 18,
                we will delete it promptly.
              </p>
            </Section>

            <Section title="11. Cookies">
              <p>
                We use essential cookies for authentication and session management. We do not use
                third-party advertising cookies or tracking pixels. Analytics, if any, use
                privacy-respecting, first-party methods.
              </p>
            </Section>

            <Section title="12. Changes to This Policy">
              <p>
                We may update this policy from time to time. Material changes will be communicated
                through the Platform. Continued use after changes constitutes acceptance.
              </p>
            </Section>

            <Section title="13. Contact">
              <p>
                For privacy-related inquiries, contact us at{" "}
                <a href="mailto:privacy@validue.com" className="text-[#D4A088] hover:text-white transition-colors">
                  privacy@validue.com
                </a>
              </p>
            </Section>
          </div>
        </div>
        <div className="max-w-[720px] mx-auto px-[64px] max-md:px-[24px]">
          <Footer />
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-[32px]">
      <h2 className="text-[16px] font-medium tracking-tight text-white mb-[12px]">{title}</h2>
      <div className="text-[14px] text-[#A8A29E] leading-[1.7] font-medium [&_p]:mb-[12px] [&_h3]:text-[13px] [&_h3]:font-bold [&_h3]:text-[#D4A088] [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:mb-[8px] [&_h3]:mt-[16px] [&_ul]:list-disc [&_ul]:pl-[20px] [&_ul]:mb-[12px] [&_li]:mb-[6px]">
        {children}
      </div>
    </div>
  );
}
