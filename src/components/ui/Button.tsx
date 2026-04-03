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
    "bg-accent text-white font-medium hover:bg-accent-dark shadow-[0_2px_8px_rgba(28,25,23,0.12)] hover:shadow-[0_4px_16px_rgba(212,160,136,0.18)]",
  secondary:
    "bg-white text-text-primary border border-border hover:border-border-hover hover:bg-[#FAF8F5]",
  outline:
    "bg-transparent text-text-secondary border border-border hover:border-border-hover hover:text-text-primary",
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const classes = `inline-flex items-center justify-center px-[28px] py-[14px] rounded-xl text-[14px] font-medium font-sans cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${variantClasses[variant]} ${className}`;

  if ("href" in props && props.href) {
    const { href, ...rest } = props as AnchorProps;
    return <a href={href} className={classes} {...rest} />;
  }

  return <button className={classes} {...(props as ButtonProps)} />;
}
