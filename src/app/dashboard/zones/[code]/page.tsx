import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateTokenForm } from "@/components/rotate-token-form";
import { StatusBadge } from "@/components/status-badge";
import { SubmissionSummary } from "@/components/submission-summary";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ZoneImage } from "@/components/zone-image";
import { ChecklistPreview } from "@/components/checklist-preview";
import { ZoneChecklistByCode } from "@/components/zone-checklist-by-code";
import { ZoneCleaningManual } from "@/components/zone-cleaning-manual";
import { ZoneAssigneeForm } from "@/components/zone-assignee-form";
import { ResetForm } from "@/components/reset-form";
import {
  getCheckMarks,
  getChecklistItems,
  getSubmission,
  getZoneByCode,
} from "@/lib/dal";
import { hasOwnChecklist } from "@/lib/zone-checklist-registry";

export default async function ZoneDetailPage({
  params,
}: PageProps<"/dashboard/zones/[code]">) {
  const { code } = await params;
  const zone = await getZoneByCode(code);

  if (!zone) notFound();

  const ownChecklist = hasOwnChecklist(zone.code);

  const [items, submission, checkMarks] = await Promise.all([
    getChecklistItems(zone.id),
    getSubmission(zone.id),
    ownChecklist ? getCheckMarks(zone.id) : {},
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 transition hover:text-zinc-900"
        >
          ← 구역 현황
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              {zone.label}
            </h1>
            <StatusBadge status={zone.status} />
          </div>
          <div className="flex items-center gap-2">
            <CopyLinkButton path={`/c/${zone.token}`} />
            <RotateTokenForm code={zone.code} />
            <ResetForm scope="zone" code={zone.code} />
          </div>
        </div>
      </div>

      <ZoneImage code={zone.code} label={zone.label} />

      <ZoneAssigneeForm
        key={`${zone.assignee_congregation ?? ""}-${zone.assignee_name ?? ""}-${zone.contact_name ?? ""}-${zone.contact_phone ?? ""}`}
        zone={zone}
      />

      <ZoneCleaningManual code={zone.code} />

      {ownChecklist ? (
        <ZoneChecklistByCode
          code={zone.code}
          token={zone.token}
          initialMarks={checkMarks}
        />
      ) : (
        <ChecklistPreview items={items} />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-zinc-900">
          제출 내역
        </h2>
        <SubmissionSummary submission={submission} />
      </section>
    </div>
  );
}
