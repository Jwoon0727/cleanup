import type { SubmissionDetail } from "@/types/db";

export function SubmissionSummary({
  submission,
}: {
  submission: SubmissionDetail | null;
}) {
  if (!submission) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-brand-100">
        <p className="text-sm text-zinc-500">
          아직 제출된 체크리스트가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
      <p className="text-xs text-zinc-500">
        {new Date(submission.submitted_at).toLocaleString("ko-KR")}
      </p>

      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">회중</dt>
          <dd className="mt-0.5 font-medium text-zinc-900">
            {submission.congregation}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">이름</dt>
          <dd className="mt-0.5 font-medium text-zinc-900">
            {submission.volunteer_name}
          </dd>
        </div>
      </dl>

      {submission.items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          구역 전용 체크리스트를 사용하는 구역입니다. 체크 내역은 봉사자
          브라우저에만 저장됩니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {submission.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 text-sm text-zinc-700"
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                  item.checked ? "bg-emerald-500 text-white" : "bg-brand-100 text-brand-300"
                }`}
              >
                {item.checked ? "✓" : ""}
              </span>
              <span>{item.label_snapshot}</span>
              <span className="sr-only">{item.checked ? "완료" : "미완료"}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
