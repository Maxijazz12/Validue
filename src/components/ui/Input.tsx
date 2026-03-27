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
          className="text-[13px] font-medium text-[#555555]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-[16px] py-[12px] rounded-lg border border-[#ebebeb] bg-white text-[15px] text-[#111111] font-sans placeholder:text-[#999999] outline-none transition-all duration-200 focus:border-[#d4d4d4] focus:shadow-[0_0_0_3px_rgba(232,184,122,0.1)] ${error ? "border-red-400" : ""} ${className}`}
        {...props}
      />
      {error && (
        <span className="text-[12px] text-red-500">{error}</span>
      )}
    </div>
  );
}
