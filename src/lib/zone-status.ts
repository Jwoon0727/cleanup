import type { ZoneStatus } from "@/types/db";

type StatusMeta = {
  /** 대시보드 배지 문구 */
  label: string;
  /** 배지 스타일 (Tailwind) */
  className: string;
};

export const ZONE_STATUS_META: Record<ZoneStatus, StatusMeta> = {
  PENDING: {
    label: "미청소",
    className:
      "bg-zinc-100 text-zinc-500 ring-zinc-200",
  },
  SUBMITTED: {
    label: "청소완료",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
};

/**
 * 0003 마이그레이션 적용 전 DB 에 남아 있을 수 있는 옛 status 값
 * (APPROVED/REWORK/RESUBMITTED) 을 위한 안전한 조회.
 * 알 수 없는 값은 "확인 필요" 로 표시하고 페이지 렌더는 계속 진행한다.
 */
export function zoneStatusMeta(status: string): StatusMeta {
  return (
    ZONE_STATUS_META[status as ZoneStatus] ?? {
      label: "확인 필요",
      className: "bg-amber-50 text-amber-800 ring-amber-300",
    }
  );
}

/** 봉사자가 지금 체크리스트를 제출할 수 있는 상태인가 */
export function canVolunteerSubmit(status: ZoneStatus): boolean {
  return status === "PENDING";
}
