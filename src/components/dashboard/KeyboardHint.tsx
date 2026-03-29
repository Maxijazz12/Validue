"use client";

export default function KeyboardHint({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-[24px] left-1/2 -translate-x-1/2 z-30 keyboard-hint">
      <div className="flex items-center gap-[8px] px-[16px] py-[8px] bg-[#111111] text-white text-[12px] font-medium rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex-wrap justify-center">
        <span className="flex items-center gap-[3px]">
          <kbd className="px-[5px] py-[1px] bg-white/20 rounded text-[11px]">J</kbd>
          <kbd className="px-[5px] py-[1px] bg-white/20 rounded text-[11px]">K</kbd>
        </span>
        <span>navigate</span>
        <span className="text-white/40">·</span>
        <kbd className="px-[5px] py-[1px] bg-white/20 rounded text-[11px]">Enter</kbd>
        <span>expand</span>
        <span className="text-white/40">·</span>
        <kbd className="px-[5px] py-[1px] bg-white/20 rounded text-[11px]">R</kbd>
        <span>respond</span>
        <span className="text-white/40">·</span>
        <kbd className="px-[5px] py-[1px] bg-white/20 rounded text-[11px]">S</kbd>
        <span>save</span>
        <span className="text-white/40">·</span>
        <kbd className="px-[5px] py-[1px] bg-white/20 rounded text-[11px]">/</kbd>
        <span>search</span>
        <span className="text-white/40">·</span>
        <kbd className="px-[5px] py-[1px] bg-white/20 rounded text-[11px]">Esc</kbd>
        <span>close</span>
      </div>
    </div>
  );
}
