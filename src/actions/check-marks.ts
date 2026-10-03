"use server";

import { after } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { canVolunteerSubmit } from "@/lib/zone-status";
import {
  MARK_EVENT,
  markChannelName,
  markOpsSchema,
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

/** retry: 일시적 오류라 같은 요청을 다시 보내면 성공할 수 있다. */
type SyncResult =
  | { ok: true; at: number }
  | { ok: false; message: string; retry: boolean };

type Failure = { message: string; retry: boolean };

async function findZone(token: string): Promise<{ zone: Zone } | Failure> {
  if (!token) return { message: "잘못된 접근입니다.", retry: false };

  const { data, error } = await getSupabase()
    .from("zones")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) return { message: `구역 조회 실패: ${error.message}`, retry: true };
  if (!data) return { message: "존재하지 않는 구역입니다.", retry: false };
  return { zone: data as Zone };
}

async function findWritableZone(token: string) {
  const found = await findZone(token);
  if ("zone" in found && !canVolunteerSubmit(found.zone.status)) {
    return { message: "이미 제출이 완료된 구역입니다.", retry: false };
  }
  return found;
}

/** 브로드캐스트 실패는 저장 실패가 아니다. 다른 화면은 재동기화로 따라잡는다. */
async function broadcast(token: string, events: MarkEvent[]) {
  const supabase = getSupabase();
  const channel = supabase.channel(markChannelName(token));
  try {
    for (const event of events) {
      const res = await channel.httpSend(MARK_EVENT, event);
      if (!res.success) console.error("체크 상태 브로드캐스트 실패:", res.error);
    }
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

/**
 * 클라이언트가 모아 둔 변경(set / 탭 초기화 clear)을 순서대로 한 번에 저장한다.
 * 같은 요청을 다시 보내도 결과가 같으므로(멱등) 네트워크 실패 시 그대로 재시도할 수 있다.
 * 브로드캐스트는 응답을 보낸 뒤(after) 처리해 느린 망에서도 응답을 빨리 돌려준다.
 */
export async function syncCheckMarksAction(
  token: string,
  ops: unknown,
): Promise<SyncResult> {
  const parsed = markOpsSchema.safeParse(ops);
  if (!parsed.success) return { ok: false, message: "잘못된 입력입니다.", retry: false };

  const found = await findWritableZone(token);
  if (!("zone" in found)) return { ok: false, ...found };

  const supabase = getSupabase();
  const zoneId = found.zone.id;
  const at = Date.now();
  const updatedAt = new Date(at).toISOString();
  const events: MarkEvent[] = [];
  let sets = new Map<string, MarkValue>();

  const writeSets = async () => {
    if (sets.size === 0) return null;
    const rows = [...sets].map(([key, value]) => ({
      zone_id: zoneId,
      key,
      value,
      updated_at: updatedAt,
    }));
    const { error } = await supabase.from("zone_check_marks").upsert(rows);
    if (error) return `저장 실패: ${error.message}`;
    for (const [key, value] of sets) events.push({ type: "set", key, value, at });
    sets = new Map();
    return null;
  };

  const run = async (): Promise<string | null> => {
    for (const op of parsed.data) {
      if (op.t === "set") {
        sets.set(op.key, op.value);
        continue;
      }

      const setError = await writeSets();
      if (setError) return setError;

      // key 의 '_' 가 LIKE 와일드카드와 겹치므로 목록을 받아 앱에서 거른다(구역당 수십 행).
      const { data, error } = await supabase
        .from("zone_check_marks")
        .select("key")
        .eq("zone_id", zoneId);
      if (error) return `초기화 실패: ${error.message}`;

      const keys = (data ?? [])
        .map((row) => row.key as string)
        .filter((key) => op.prefixes.some((prefix) => key.startsWith(prefix)));
      if (keys.length === 0) continue;

      const { error: deleteError } = await supabase
        .from("zone_check_marks")
        .delete()
        .eq("zone_id", zoneId)
        .in("key", keys);
      if (deleteError) return `초기화 실패: ${deleteError.message}`;

      events.push({ type: "clear", keys, at });
    }
    return writeSets();
  };

  const failure = await run();

  // 일부만 저장된 경우에도 저장된 만큼은 다른 화면에 알린다.
  if (events.length > 0) after(() => broadcast(token, events));

  if (failure) return { ok: false, message: failure, retry: true };
  return { ok: true, at };
}
