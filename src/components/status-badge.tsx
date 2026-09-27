import { zoneStatusMeta } from "@/lib/zone-status";
import type { ZoneStatus } from "@/types/db";

export function StatusBadge({
  status,
  className = "",
}: {
  // 마이그레이션 적용 전에는 DB 값이 이 타입을 벗어날 수 있다.
  status: ZoneStatus;
  className?: string;
}) {
  const meta = zoneStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.className} ${className}`}
    >
      {meta.label}
    </span>
  );
}
