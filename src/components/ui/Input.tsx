import { type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({ label, error, className = "", id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-[6px]">
      {label && (
        <label
          htmlFor={id}
          className="text-[12px] font-medium text-[#64748B]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-[16px] py-[12px] rounded-xl border border-[#E2E8F0] bg-white text-[15px] text-[#111111] font-sans placeholder:text-[#94A3B8] outline-none transition-all duration-200 focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] ${error ? "border-red-400" : ""} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-[12px] text-red-500">{error}</span>
      )}
    </div>
  );
}
