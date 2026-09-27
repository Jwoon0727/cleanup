import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { CopyLinkButton } from "@/components/copy-link-button";
import type { Zone } from "@/types/db";

export function ZoneCard({
  zone,
  submittedAt,
}: {
  zone: Zone;
  submittedAt: string | null;
}) {
  const isPending = zone.status === "PENDING";

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 transition ${
        isPending ? "ring-2 ring-brand-400" : "ring-brand-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-zinc-900">
            {zone.label}
          </p>
          {submittedAt && (
            <p className="mt-1 text-xs text-zinc-500">
              최근 제출 {new Date(submittedAt).toLocaleString("ko-KR")}
            </p>
          )}
          {zone.assignee_name && zone.assignee_congregation && (
            <p className="mt-1 text-xs text-zinc-500">
              지정 {zone.assignee_name} · {zone.assignee_congregation}
            </p>
          )}
        </div>
        <StatusBadge status={zone.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/dashboard/zones/${zone.code}`}
          className="inline-flex items-center rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
        >
          상세 보기
        </Link>
        <CopyLinkButton path={`/c/${zone.token}`} />
      </div>
    </div>
  );
}
