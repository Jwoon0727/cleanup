"use client";

import { useActionState, useState } from "react";
import { resetAllZonesAction, resetZoneAction } from "@/actions/reset";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/validation";

type Props = { scope: "all" } | { scope: "zone"; code: string };

export function ResetForm(props: Props) {
  const [confirming, setConfirming] = useState(false);

  const action = props.scope === "all" ? resetAllZonesAction : resetZoneAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-50"
        >
          {props.scope === "all" ? "전체 리셋" : "이 구역 리셋"}
        </button>
        <FormMessage state={state} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-amber-50 p-3 ring-1 ring-inset ring-amber-200">
      <p className="text-xs leading-5 text-amber-900">
        {props.scope === "all"
          ? "모든 구역의 제출 기록을 지우고 미청소로 되돌립니다. 되돌릴 수 없습니다."
          : "이 구역의 제출 기록을 지우고 미청소로 되돌립니다. 되돌릴 수 없습니다."}{" "}
        지정 제출자는 유지됩니다.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <form action={formAction}>
          {props.scope === "zone" && (
            <input type="hidden" name="code" value={props.code} />
          )}
          <SubmitButton
            pending={pending}
            variant="danger"
            className="!px-2.5 !py-1.5 !text-xs"
          >
            확인
          </SubmitButton>
        </form>

        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          취소
        </button>
      </div>

      <FormMessage state={state} />
    </div>
  );
}
