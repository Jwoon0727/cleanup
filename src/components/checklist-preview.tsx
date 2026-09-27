import type { ChecklistItem } from "@/types/db";

export function ChecklistPreview({ items }: { items: ChecklistItem[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">체크항목</h2>
        <span className="text-xs font-medium text-zinc-500 tabular-nums">
          {items.length}개
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          이 구역에는 체크리스트 항목이 등록되지 않았습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 text-sm text-zinc-700"
            >
              <span
                aria-hidden
                className="mt-0.5 flex h-4 w-4 shrink-0 rounded bg-brand-100"
              />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-500">
        이 목록이 봉사자 URL 에 그대로 표시됩니다.
      </p>
    </div>
  );
}
