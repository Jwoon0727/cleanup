"use client";

import { useActionState, useEffect, useState } from "react";
import { submitChecklistAction } from "@/actions/submissions";
import { checklistFieldName } from "@/lib/checklist";
import { FormMessage } from "@/components/form-message";
import { ReopenButton } from "@/components/reopen-button";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/validation";
import type { ChecklistItem } from "@/types/db";

const inputClass =
  "w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-inset ring-brand-200 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-500";

export function ChecklistForm({
  token,
  items,
  hasAssignee,
  remainingRequired,
}: {
  token: string;
  items: ChecklistItem[];
  hasAssignee: boolean;
  /** 구역 전용 체크리스트(items 없음)에서 아직 체크되지 않은 필수 항목 수 */
  remainingRequired?: number;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [congregation, setCongregation] = useState("");
  const [volunteerName, setVolunteerName] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);

  const [state, action, pending] = useActionState<FormState, FormData>(
    submitChecklistAction,
    undefined,
  );

  const checkedCount = items.filter((item) => checked[item.id]).length;
  const remaining =
    items.length === 0 ? (remainingRequired ?? 0) : items.length - checkedCount;
  const allChecked = remaining === 0;
  const canSubmit =
    allChecked && congregation.trim().length > 0 && volunteerName.trim().length > 0;

  const authorSummary =
    congregation.trim() && volunteerName.trim()
      ? `${congregation.trim()} · ${volunteerName.trim()}`
      : "회중과 이름을 입력해 주세요";

  useEffect(() => {
    if (state && !state.ok) setSubmitOpen(true);
  }, [state]);

  if (state?.ok) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-8 text-center ring-1 ring-emerald-200">
        <p className="text-lg font-semibold text-emerald-900">
          제출 완료
        </p>
        <p className="mt-2 text-sm text-emerald-800">
          {state.message}
        </p>
        <ReopenButton token={token} className="mt-5" />
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="token" value={token} />

      {items.length > 0 && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">
              체크리스트
            </h2>
            <span className="text-xs font-medium text-zinc-500 tabular-nums">
              {checkedCount} / {items.length}
            </span>
          </div>

          <ul className="mt-4 flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 transition hover:bg-brand-50">
                  <input
                    type="checkbox"
                    name={checklistFieldName(item.id)}
                    checked={checked[item.id] ?? false}
                    onChange={(e) =>
                      setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))
                    }
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-brand-200 accent-brand-500"
                  />
                  <span className="text-sm leading-6 text-zinc-800">
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-brand-100">
        <button
          type="button"
          onClick={() => setSubmitOpen((open) => !open)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-brand-50/80 sm:px-5"
          aria-expanded={submitOpen}
        >
          <span className="text-sm font-semibold text-zinc-900">작성자 · 제출</span>
          <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">
            {canSubmit ? "제출 준비됨" : authorSummary}
          </span>
          <span
            className={[
              "shrink-0 text-xs text-zinc-400 transition-transform",
              submitOpen ? "rotate-180" : "",
            ].join(" ")}
            aria-hidden
          >
            ▼
          </span>
        </button>

        {submitOpen ? (
          <div className="flex flex-col gap-4 border-t border-brand-100 px-4 pb-5 pt-4 sm:px-5">
            {hasAssignee && (
              <p className="rounded-lg bg-brand-50 px-3 py-2.5 text-xs leading-5 text-brand-700 ring-1 ring-inset ring-brand-100">
                이 구역은 지정된 봉사자만 제출할 수 있습니다. 지정된 회중·이름과
                다르면 제출되지 않습니다.
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="congregation"
                className="text-sm font-medium text-zinc-700"
              >
                회중
              </label>
              <input
                id="congregation"
                name="congregation"
                value={congregation}
                onChange={(e) => setCongregation(e.target.value)}
                required
                maxLength={100}
                className={inputClass}
                placeholder="회중 이름"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="volunteerName"
                className="text-sm font-medium text-zinc-700"
              >
                이름
              </label>
              <input
                id="volunteerName"
                name="volunteerName"
                value={volunteerName}
                onChange={(e) => setVolunteerName(e.target.value)}
                required
                maxLength={50}
                className={inputClass}
                placeholder="작성자 이름"
              />
            </div>

            <FormMessage state={state} />

            <div className="flex flex-col gap-2">
              <SubmitButton pending={pending} disabled={!canSubmit} className="w-full">
                제출하기
              </SubmitButton>
              {!canSubmit && (
                <p className="text-center text-xs text-zinc-500">
                  {!allChecked
                    ? `모든 항목을 체크해 주세요. (${remaining}개 남음)`
                    : "회중과 이름을 입력해 주세요."}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </form>
  );
}
