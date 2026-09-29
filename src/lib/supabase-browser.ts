"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 브라우저용 Supabase 클라이언트 — Realtime 구독 전용.
 *
 * anon(publishable) 키만 쓰며 테이블은 RLS deny-all 이므로 DB 를 직접 읽거나 쓰지 않는다.
 * 키가 설정되지 않았으면 null 을 돌려주고, 호출 측은 화면 복귀 시 재동기화만 한다.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isRealtimeConfigured = Boolean(url && key);

let cached: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  cached =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

  return cached;
}
