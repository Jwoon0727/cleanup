import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChecklistForm } from "@/components/checklist-form";
import { ContactNotice } from "@/components/contact-notice";
import { ZoneChecklistByCode } from "@/components/zone-checklist-by-code";
import { ZoneCleaningManual } from "@/components/zone-cleaning-manual";
import { ZoneImage } from "@/components/zone-image";
import {
  getCheckMarks,
  getChecklistItems,
  getSubmission,
  getZoneByToken,
} from "@/lib/dal";
import { canVolunteerSubmit } from "@/lib/zone-status";
import { hasAssignee } from "@/lib/assignee";
import { hasOwnChecklist } from "@/lib/zone-checklist-registry";

// 구역 URL 은 토큰 자체가 접근 권한이므로 색인되지 않게 한다.
export const metadata: Metadata = {
  title: "청소 체크리스트",
  robots: { index: false, follow: false, nocache: true },
};

export default async function VolunteerChecklistPage({
  params,
}: PageProps<"/c/[token]">) {
  const { token } = await params;
  const zone = await getZoneByToken(token);

  if (!zone) notFound();

  const submittable = canVolunteerSubmit(zone.status);
  const ownChecklist = hasOwnChecklist(zone.code);

  const [items, submission, checkMarks] = await Promise.all([
    getChecklistItems(zone.id),
    getSubmission(zone.id),
    submittable && ownChecklist ? getCheckMarks(zone.id) : {},
  ]);
  return (
    <div className="flex flex-1 justify-center bg-brand-50 px-5 py-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <header>
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            청소 체크리스트
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {zone.label}
          </h1>
        </header>

        <ZoneImage code={zone.code} label={zone.label} />

        <ZoneCleaningManual code={zone.code} />

        {submittable ? (
          ownChecklist ? (
            <>
              <ZoneChecklistByCode
                code={zone.code}
                token={zone.token}
                initialMarks={checkMarks}
              />
              <ChecklistForm
                token={zone.token}
                items={[]}
                hasAssignee={hasAssignee(zone)}
              />
            </>
          ) : items.length > 0 ? (
            <ChecklistForm
              token={zone.token}
              items={items}
              hasAssignee={hasAssignee(zone)}
            />
          ) : (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 ring-1 ring-brand-100">
              이 구역에는 아직 체크리스트 항목이 등록되지 않았습니다. 관리자에게
              문의해 주세요.
            </p>
          )
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-brand-100">
            <p className="text-lg font-semibold text-zinc-900">
              제출 완료
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              체크리스트가 제출되었습니다. 수고하셨습니다!
            </p>
            {submission && (
              <p className="mt-4 text-xs text-zinc-500">
                {submission.congregation} · {submission.volunteer_name} ·{" "}
                {new Date(submission.submitted_at).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        )}

        <ContactNotice
          contactName={zone.contact_name}
          contactPhone={zone.contact_phone}
        />
      </div>
    </div>
  );
}
