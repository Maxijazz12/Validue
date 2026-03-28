import { type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline";

type BaseProps = {
  variant?: Variant;
  className?: string;
};

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };
type AnchorProps = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type Props = ButtonProps | AnchorProps;

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#111111] text-white font-medium shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:bg-[#1a1a1a] hover:shadow-[0_4px_20px_rgba(232,193,176,0.15),0_1px_4px_rgba(232,193,176,0.08)] active:scale-[0.99]",
  secondary:
    "bg-white text-[#111111] border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]",
  outline:
    "bg-transparent text-[#64748B] border border-[#E2E8F0] hover:border-[#CBD5E1] hover:text-[#111111]",
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const classes = `inline-flex items-center justify-center px-[28px] py-[14px] rounded-xl text-[14px] font-medium font-sans cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[1px] ${variantClasses[variant]} ${className}`;

  if ("href" in props && props.href) {
    const { href, ...rest } = props as AnchorProps;
    return <a href={href} className={classes} {...rest} />;
  }

  return <button className={classes} {...(props as ButtonProps)} />;
}
