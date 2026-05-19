import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark active:scale-[0.98]",
  secondary: "bg-slate-100 text-foreground hover:bg-slate-200",
  ghost: "bg-transparent text-primary hover:bg-blue-50",
  danger: "bg-danger text-white hover:bg-red-700",
};

export function Button({
  children,
  className,
  variant = "primary",
  fullWidth,
  disabled,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-xl px-5 py-3 text-base font-semibold transition",
        "disabled:opacity-50 disabled:pointer-events-none",
        fullWidth && "w-full",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
