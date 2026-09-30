"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const defaultClassName =
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50";

export function RefreshPageButton({
  className = defaultClassName,
}: {
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className={className}
    >
      {pending ? "새로고침 중…" : "새로고침"}
    </button>
  );
}
