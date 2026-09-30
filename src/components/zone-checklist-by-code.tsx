"use client";

import { useState } from "react";
import { ChecklistForm } from "@/components/checklist-form";
import { ZoneChecklist } from "@/components/zone-checklist";
import type { MarkSnapshot } from "@/lib/check-marks";
import { getZoneConfig } from "@/lib/zone-checklist-configs";

/**
 * 구역 전용 체크리스트 + 제출 폼.
 * 체크 상태는 ZoneChecklist 안의 공유 훅이 갖고, 남은 필수 항목 수만 폼으로 올려 보낸다.
 */
export function ZoneChecklistByCode({
  code,
  token,
  initialMarks,
  hasAssignee,
}: {
  code: string;
  token: string;
  initialMarks: MarkSnapshot;
  /** 주면 제출 폼도 함께 그린다(봉사자 페이지). 생략하면 체크리스트만(대시보드). */
  hasAssignee?: boolean;
}) {
  const config = getZoneConfig(code);
  const [remaining, setRemaining] = useState<number | null>(null);
  if (!config) return null;

  return (
    <>
      <ZoneChecklist
        config={config}
        token={token}
        initialMarks={initialMarks}
        onRemainingChange={setRemaining}
      />
      {hasAssignee !== undefined && (
        <ChecklistForm
          token={token}
          items={[]}
          hasAssignee={hasAssignee}
          remainingRequired={remaining ?? undefined}
        />
      )}
    </>
  );
}
