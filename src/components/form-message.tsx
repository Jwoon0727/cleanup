import type { FormState } from "@/lib/validation";

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.message) return null;

  const tone = state.ok
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : "bg-red-50 text-red-800 ring-red-200";

  return (
    <p className={`rounded-lg px-3 py-2 text-sm ring-1 ring-inset ${tone}`}>
      {state.message}
    </p>
  );
}
