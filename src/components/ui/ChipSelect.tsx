"use client";

type ChipSelectProps = {
  label: string;
  name: string;
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
};

export default function ChipSelect({
  label,
  name,
  options,
  selected,
  onChange,
}: ChipSelectProps) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="flex flex-col gap-[8px]">
      <label className="text-[13px] font-medium text-[#555555]">{label}</label>
      <div className="flex flex-wrap gap-[8px]">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`text-[13px] px-[12px] py-[7px] rounded-full border transition-all cursor-pointer ${
                isSelected
                  ? "border-[#111111] bg-[#111111] text-white font-medium"
                  : "border-[#ebebeb] bg-white text-[#555555] hover:border-[#d4d4d4]"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}
