import Avatar from "@/components/ui/Avatar";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { testimonials } from "@/lib/constants";

export default function Testimonials() {
  return (
    <section>
      <div className="text-center mb-16">
        <p className="text-brand text-[14px] font-medium mb-4">What founders say</p>
        <h2 className="text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.02em] leading-[1.1] text-text-primary">
          Real decisions, real outcomes
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        {testimonials.map((t, i) => (
          <ScrollReveal key={t.name} animation="slide-up" staggerIndex={i}>
            <div className="bg-white rounded-2xl p-7 border border-border-light hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-[1px] transition-all duration-500 h-full flex flex-col">
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-[15px] text-text-secondary leading-[1.7] flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Attribution */}
              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border-light">
                <Avatar name={t.name} size={36} />
                <div>
                  <div className="text-[14px] font-medium text-text-primary">{t.name}</div>
                  <div className="text-[13px] text-text-muted">{t.role}</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
