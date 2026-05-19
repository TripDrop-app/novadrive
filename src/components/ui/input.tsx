import { cn } from "@/lib/cn";

export function Input({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block w-full">
      {label && (
        <span className="mb-2 block text-sm font-medium text-muted">{label}</span>
      )}
      <input
        className={cn(
          "w-full min-h-12 rounded-xl border border-border px-4 text-lg",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          className
        )}
        {...props}
      />
    </label>
  );
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl font-bold"
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span className="min-w-10 text-center text-xl font-bold">{value}</span>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-xl font-bold text-white"
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
