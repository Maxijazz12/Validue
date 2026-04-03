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
      <label className="text-[12px] font-medium text-text-secondary">{label}</label>
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
                  ? "border-accent bg-accent text-white font-medium"
                  : "border-border-light bg-white text-text-secondary hover:border-border-muted"
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
