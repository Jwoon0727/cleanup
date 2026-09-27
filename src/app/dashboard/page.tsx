import { ResetForm } from "@/components/reset-form";
import { ZoneCard } from "@/components/zone-card";
import { getSubmission, listZones } from "@/lib/dal";

export const metadata = {
  title: "대시보드 · 청소 구역 관리",
};

export default async function DashboardPage() {
  const zones = await listZones();

  const cards = await Promise.all(
    zones.map(async (zone) => ({
      zone,
      submittedAt: (await getSubmission(zone.id))?.submitted_at ?? null,
    })),
  );

  const pending = cards.filter(({ zone }) => zone.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            구역 현황
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {pending > 0
              ? `아직 제출하지 않은 구역이 ${pending}곳 있습니다.`
              : "모든 구역이 제출 완료되었습니다."}
          </p>
        </div>
        <ResetForm scope="all" />
      </div>

      {zones.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-brand-100">
          <p className="text-sm text-zinc-600">
            등록된 구역이 없습니다. <code>supabase/seed.sql</code> 을 실행해 A~H 구역을
            생성하세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ zone, submittedAt }) => (
            <ZoneCard key={zone.id} zone={zone} submittedAt={submittedAt} />
          ))}
        </div>
      )}
    </div>
  );
}
