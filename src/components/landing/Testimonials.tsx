import Avatar from "@/components/ui/Avatar";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { testimonials } from "@/lib/constants";

export default function Testimonials() {
  return (
    <section>
      <div className="grid grid-cols-3 gap-[16px] max-md:grid-cols-1">
        {testimonials.map((t, i) => (
          <ScrollReveal key={t.name} animation="slide-up" staggerIndex={i}>
            <div className="bg-white/60 backdrop-blur-3xl rounded-[24px] p-[28px] shadow-card border border-white/80 transition-all duration-500 hover:shadow-[0_16px_48px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-[2px] h-full flex flex-col">
              {/* Quote */}
              <p className="text-[14px] text-[#78716C] leading-[1.7] flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Attribution */}
              <div className="flex items-center gap-[10px] mt-[20px] pt-[16px] border-t border-black/5">
                <Avatar name={t.name} size={28} />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[#1C1917]">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-[#A8A29E]">{t.role}</div>
                </div>
                <div className="ml-auto shrink-0">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] bg-black/5 px-[8px] py-[4px] rounded-md">
                    {t.context}
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
