"use server";

import { getSupabase } from "@/lib/supabase";
import { canVolunteerSubmit } from "@/lib/zone-status";
import {
  MARK_EVENT,
  markChannelName,
  markKeySchema,
  markPrefixSchema,
  markValueSchema,
  rowsToSnapshot,
  type CheckMarkRow,
  type MarkEvent,
  type MarkSnapshot,
  type MarkValue,
} from "@/lib/check-marks";
import type { Zone } from "@/types/db";

/**
 * 봉사자 URL 체크리스트 공유 상태.
 *
 * 봉사자는 로그인이 없으므로 URL 토큰으로 구역을 찾고, DB 쓰기는 서버에서만 한다.
 * 쓰기가 성공하면 같은 구역 채널(Supabase Realtime Broadcast)로 변경분을 보내
 * 같은 URL 을 열어 둔 다른 봉사자 화면에 바로 반영되게 한다.
 */

type MarkResult = { ok: true; at: number } | { ok: false; message: string };

async function findZone(
  token: string,
): Promise<{ zone: Zone } | { message: string }> {
  if (!token) return { message: "잘못된 접근입니다." };

  const { data, error } = await getSupabase()
    .from("zones")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) return { message: `구역 조회 실패: ${error.message}` };
  if (!data) return { message: "존재하지 않는 구역입니다." };
  return { zone: data as Zone };
}

async function findWritableZone(token: string) {
  const found = await findZone(token);
  if ("zone" in found && !canVolunteerSubmit(found.zone.status)) {
    return { message: "이미 제출이 완료된 구역입니다." };
  }
  return found;
}

/** 브로드캐스트 실패는 저장 실패가 아니다. 다른 화면은 재동기화로 따라잡는다. */
async function broadcast(token: string, event: MarkEvent) {
  const supabase = getSupabase();
  const channel = supabase.channel(markChannelName(token));
  try {
    const res = await channel.httpSend(MARK_EVENT, event);
    if (!res.success) console.error("체크 상태 브로드캐스트 실패:", res.error);
  } catch (err) {
    console.error("체크 상태 브로드캐스트 실패:", err);
  } finally {
    await supabase.removeChannel(channel);
  }
}

export async function getCheckMarksAction(
  token: string,
): Promise<
  { ok: true; marks: MarkSnapshot; at: number } | { ok: false; message: string }
> {
  const found = await findZone(token);
  if (!("zone" in found)) return { ok: false, message: found.message };

  // 조회 시작 시각. 이후에 기록된 변경은 스냅샷에 없을 수 있다.
  const at = Date.now();

  const { data, error } = await getSupabase()
    .from("zone_check_marks")
    .select("key, value, updated_at")
    .eq("zone_id", found.zone.id);

  if (error) return { ok: false, message: `체크 상태 조회 실패: ${error.message}` };
  return { ok: true, marks: rowsToSnapshot((data ?? []) as CheckMarkRow[]), at };
}

export async function setCheckMarkAction(
  token: string,
  key: string,
  value: MarkValue,
): Promise<MarkResult> {
  const parsedKey = markKeySchema.safeParse(key);
  const parsedValue = markValueSchema.safeParse(value);
  if (!parsedKey.success || !parsedValue.success) {
    return { ok: false, message: "잘못된 입력입니다." };
  }

  const found = await findWritableZone(token);
  if (!("zone" in found)) return { ok: false, message: found.message };

  const now = new Date();
  const { error } = await getSupabase()
    .from("zone_check_marks")
    .upsert({
      zone_id: found.zone.id,
      key: parsedKey.data,
      value: parsedValue.data,
      updated_at: now.toISOString(),
    });

  if (error) return { ok: false, message: `저장 실패: ${error.message}` };

  const at = now.getTime();
  await broadcast(token, {
    type: "set",
    key: parsedKey.data,
    value: parsedValue.data,
    at,
  });

  return { ok: true, at };
}

/** 탭 초기화: 접두어가 일치하는 key 를 모두 지운다. */
export async function clearCheckMarksAction(
  token: string,
  prefixes: string[],
): Promise<MarkResult> {
  const parsed = markPrefixSchema.array().min(1).max(5).safeParse(prefixes);
  if (!parsed.success) return { ok: false, message: "잘못된 입력입니다." };

  const found = await findWritableZone(token);
  if (!("zone" in found)) return { ok: false, message: found.message };

  const supabase = getSupabase();
  const at = Date.now();

  // key 의 '_' 가 LIKE 와일드카드와 겹치므로 목록을 받아 앱에서 거른다(구역당 수십 행).
  const { data, error } = await supabase
    .from("zone_check_marks")
    .select("key")
    .eq("zone_id", found.zone.id);

  if (error) return { ok: false, message: `초기화 실패: ${error.message}` };

  const keys = (data ?? [])
    .map((row) => row.key as string)
    .filter((key) => parsed.data.some((prefix) => key.startsWith(prefix)));

  if (keys.length > 0) {
    const { error: deleteError } = await supabase
      .from("zone_check_marks")
      .delete()
      .eq("zone_id", found.zone.id)
      .in("key", keys);

    if (deleteError)
      return { ok: false, message: `초기화 실패: ${deleteError.message}` };

    await broadcast(token, { type: "clear", keys, at });
  }

  return { ok: true, at };
}
