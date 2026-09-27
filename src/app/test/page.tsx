import Link from "next/link";

import { getDbTestNotes } from "@/actions/db-test";
import { DbTestPanel } from "@/components/db-test-panel";
import { getSupabaseConfigStatus } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  const config = getSupabaseConfigStatus();
  const { notes, error } = await getDbTestNotes();

  return (
    <div className="min-h-full bg-brand-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            ← 홈으로
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Supabase DB 테스트
          </h1>
          <p className="text-sm text-zinc-600">
            `/test` 페이지에서 Supabase 입출력을 확인합니다.
          </p>
        </header>

        <section className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">연결 상태</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-brand-50 px-4 py-3">
              <dt className="text-zinc-500">NEXT_PUBLIC_SUPABASE_URL</dt>
              <dd className="mt-1 font-medium text-zinc-900">
                {config.hasUrl ? "설정됨" : "미설정"}
              </dd>
            </div>
            <div className="rounded-lg bg-brand-50 px-4 py-3">
              <dt className="text-zinc-500">SUPABASE_SERVICE_ROLE_KEY</dt>
              <dd className="mt-1 font-medium text-zinc-900">
                {!config.hasServiceRoleKey
                  ? "미설정"
                  : config.hasValidServiceRoleKey
                    ? "service_role (올바름)"
                    : `${config.keyRole ?? "알 수 없음"} key (잘못됨)`}
              </dd>
            </div>
          </dl>

          {config.hasServiceRoleKey && !config.hasValidServiceRoleKey ? (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-medium">
                anon key가 service role 자리에 들어가 있습니다.
              </p>
              <p className="mt-2">
                RLS가 켜진 테이블은 anon key로 저장할 수 없습니다. Supabase
                Dashboard → Settings → API →{" "}
                <strong>service_role (secret)</strong> 키를 복사해{" "}
                <code className="rounded bg-red-100 px-1">
                  SUPABASE_SERVICE_ROLE_KEY
                </code>
                에 넣고 개발 서버를 재시작하세요.
              </p>
            </div>
          ) : null}

          {!config.isReady ? (
            <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">환경 변수 설정이 필요합니다.</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  <code className="rounded bg-amber-100 px-1">
                    .env.local.example
                  </code>
                  를 참고해{" "}
                  <code className="rounded bg-amber-100 px-1">.env.local</code>
                  을 만드세요.
                </li>
                <li>
                  Supabase SQL Editor에서{" "}
                  <code className="rounded bg-amber-100 px-1">
                    supabase/migrations/0000_db_test.sql
                  </code>
                  을 실행하세요.
                </li>
                <li>개발 서버를 재시작한 뒤 이 페이지를 새로고침하세요.</li>
              </ol>
            </div>
          ) : config.hasValidServiceRoleKey ? (
            <p className="mt-4 text-sm text-emerald-700">
              환경 변수가 올바르게 설정되었습니다. 아래에서 저장/조회/삭제를
              테스트할 수 있습니다.
            </p>
          ) : null}
        </section>

        {config.isReady ? (
          <DbTestPanel notes={notes} fetchError={error} />
        ) : null}
      </div>
    </div>
  );
}
