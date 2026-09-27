import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * service role 키를 쓰는 서버 전용 Supabase 클라이언트.
 *
 * 봉사자는 로그인이 없으므로 브라우저에서 Supabase 를 직접 호출하지 않는다.
 * 모든 DB 접근은 서버에서만 이루어지고, 테이블은 RLS deny-all 로 잠겨 있다.
 *
 * 빌드 타임에 환경변수가 없어도 모듈 로딩이 실패하지 않도록 지연 생성한다.
 */

function readUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
}

function readServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/** JWT 페이로드의 role 클레임을 읽는다 (anon 키 오설정 감지용). */
function readKeyRole(key: string | undefined): string | null {
  if (!key) return null;
  const payload = key.split(".")[1];
  if (!payload) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64").toString("utf8"),
    ) as { role?: string };
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

export type SupabaseConfigStatus = {
  hasUrl: boolean;
  hasServiceRoleKey: boolean;
  hasValidServiceRoleKey: boolean;
  keyRole: string | null;
  isReady: boolean;
};

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const url = readUrl();
  const key = readServiceRoleKey();
  const keyRole = readKeyRole(key);

  return {
    hasUrl: Boolean(url),
    hasServiceRoleKey: Boolean(key),
    hasValidServiceRoleKey: keyRole === "service_role",
    keyRole,
    isReady: Boolean(url && key),
  };
}

let cached: SupabaseClient | null = null;

export function createSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = readUrl();
  const key = readServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. .env.local.example 을 참고하세요.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}

/** createSupabaseAdmin() 의 별칭. */
export const getSupabase = createSupabaseAdmin;
