"use client";

import { useActionState, useState } from "react";
import { setZoneAssigneeAction } from "@/actions/zone-assignee";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/validation";
import type { Zone } from "@/types/db";

const inputClass =
  "w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-zinc-900 ring-1 ring-inset ring-brand-200 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-500";

export function ZoneAssigneeForm({ zone }: { zone: Zone }) {
  const [congregation, setCongregation] = useState(zone.assignee_congregation ?? "");
  const [name, setName] = useState(zone.assignee_name ?? "");

  const [saveState, save, savePending] = useActionState<FormState, FormData>(
    setZoneAssigneeAction,
    undefined,
  );
  const [clearState, clear, clearPending] = useActionState<FormState, FormData>(
    setZoneAssigneeAction,
    undefined,
  );

  const state = clearState ?? saveState;
  const pending = savePending || clearPending;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          지정 제출자
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          비워 두면 누구나 제출할 수 있습니다. 지정하면 아래 회중·이름과 일치하는
          경우에만 제출이 허용됩니다.
        </p>
      </div>

      <form action={save} className="flex flex-col gap-4">
        <input type="hidden" name="code" value={zone.code} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="assigneeCongregation" className="text-sm font-medium text-zinc-700">
            회중
          </label>
          <input
            id="assigneeCongregation"
            name="assigneeCongregation"
            value={congregation}
            onChange={(e) => setCongregation(e.target.value)}
            maxLength={100}
            className={inputClass}
            placeholder="예) 백석"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="assigneeName" className="text-sm font-medium text-zinc-700">
            이름
          </label>
          <input
            id="assigneeName"
            name="assigneeName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className={inputClass}
            placeholder="예) 최정운"
          />
        </div>

        <FormMessage state={state} />

        <div className="flex flex-wrap gap-3">
          <SubmitButton pending={savePending} disabled={pending}>
            저장
          </SubmitButton>
        </div>
      </form>

      <form action={clear}>
        <input type="hidden" name="code" value={zone.code} />
        <input type="hidden" name="assigneeCongregation" value="" />
        <input type="hidden" name="assigneeName" value="" />
        <SubmitButton pending={clearPending} disabled={pending} variant="ghost">
          지정 해제
        </SubmitButton>
      </form>
    </div>
  );
}
