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
    "bg-[#111111] text-white font-semibold hover:bg-[#222222] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:scale-[1.01]",
  secondary:
    "bg-white text-[#111111] border border-[#ebebeb] hover:border-[#d4d4d4] hover:bg-[#fafafa]",
  outline:
    "bg-transparent text-[#111111] border border-[#ebebeb] hover:border-[#d4d4d4] hover:bg-[#fafafa]",
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const classes = `inline-flex items-center justify-center px-[32px] py-[14px] rounded-lg text-[15px] font-medium font-sans cursor-pointer transition-all duration-200 ${variantClasses[variant]} ${className}`;

  if ("href" in props && props.href) {
    const { href, ...rest } = props as AnchorProps;
    return <a href={href} className={classes} {...rest} />;
  }

  return <button className={classes} {...(props as ButtonProps)} />;
}
