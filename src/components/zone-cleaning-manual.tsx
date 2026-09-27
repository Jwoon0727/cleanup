import { getZoneCleaningManual } from "@/lib/zone-cleaning-manual-data";

/** 구역 청소 매뉴얼 — 탭 체크리스트와 별도, 원본 문서(표) 형식 */
export function ZoneCleaningManual({ code }: { code: string }) {
  const entries = getZoneCleaningManual(code);
  if (!entries?.length) return null;

  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
      <div className="divide-y divide-zinc-200">
        {entries.map((entry, index) => {
          const rowKey =
            entry.heading ??
            entry.instructions?.[0] ??
            `manual-row-${index}`;
          return (
            <div key={rowKey} className="px-4 py-3.5 sm:px-5">
              {entry.heading ? (
                <p className="text-sm font-bold leading-6 text-zinc-900">
                  {entry.heading}
                </p>
              ) : null}
              {entry.instructions?.map((line) => (
                <p
                  key={`${rowKey}-${line}`}
                  className={`text-sm leading-5 text-blue-700${entry.heading ? " mt-1" : ""}`}
                >
                  {line}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
