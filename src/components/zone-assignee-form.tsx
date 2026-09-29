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
  const [contactName, setContactName] = useState(zone.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(zone.contact_phone ?? "");

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

        <div className="border-t border-brand-100 pt-4">
          <p className="text-sm font-semibold text-zinc-900">청소부 요원 (결과 연락)</p>
          <p className="mt-1 text-xs text-zinc-500">
            봉사자 URL 하단에 &quot;청소가 끝나면 청소부 요원(이름, 연락처)에게 결과를 알려주세요&quot; 안내로 표시됩니다.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contactName" className="text-sm font-medium text-zinc-700">
            청소부 요원 이름
          </label>
          <input
            id="contactName"
            name="contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            maxLength={50}
            className={inputClass}
            placeholder="예) 김현철 형제"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contactPhone" className="text-sm font-medium text-zinc-700">
            청소부 요원 연락처
          </label>
          <input
            id="contactPhone"
            name="contactPhone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            maxLength={30}
            className={inputClass}
            placeholder="예) 010-5329-2792"
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
        <input type="hidden" name="contactName" value={contactName} />
        <input type="hidden" name="contactPhone" value={contactPhone} />
        <SubmitButton pending={clearPending} disabled={pending} variant="ghost">
          지정 제출자만 해제
        </SubmitButton>
      </form>
    </div>
  );
}
