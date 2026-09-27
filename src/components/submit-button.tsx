"use client";

export function SubmitButton({
  children,
  pending,
  disabled,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pending?: boolean;
  disabled?: boolean;
  variant?: "primary" | "danger" | "ghost";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary: "bg-brand-500 text-white shadow-sm hover:bg-brand-600",
    danger: "bg-amber-400 text-amber-950 shadow-sm hover:bg-amber-500",
    ghost:
      "bg-white text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-50",
  } as const;

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {pending ? "처리 중…" : children}
    </button>
  );
}
