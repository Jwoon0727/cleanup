import * as z from "zod";

/**
 * 구역 체크리스트 공유 상태(zone_check_marks) 규칙.
 * 서버 액션·클라이언트가 함께 쓰므로 Server Action 파일 밖에 둔다.
 *
 * key 형식
 *   c:<탭>::<그룹>::<항목>  체크 항목 (boolean)
 *   q:<도구id>              청소 도구 수량 (string)
 *   r:<도구id>              반납 확인 (boolean)
 */

export type MarkValue = boolean | string;

/** key → { 값, 서버 기록 시각(ms) } */
export type MarkSnapshot = Record<string, { value: MarkValue; at: number }>;

export type MarkEvent =
  | { type: "set"; key: string; value: MarkValue; at: number }
  | { type: "clear"; keys: string[]; at: number };

export const MARK_EVENT = "mark";

/** 봉사자 URL 토큰 자체가 접근 권한이므로 채널 이름에도 토큰을 쓴다. */
export const markChannelName = (token: string) => `zone-marks:${token}`;

export const checkKey = (tabKey: string, gi: number, ii: number) =>
  `c:${tabKey}::${gi}::${ii}`;
export const qtyKey = (toolId: string) => `q:${toolId}`;
export const returnKey = (toolId: string) => `r:${toolId}`;

/** 탭 초기화 시 지울 key 접두어 */
export const checkTabPrefix = (tabKey: string) => `c:${tabKey}::`;
export const SUPPLIES_PREFIXES = ["q:", "r:"] as const;

export type CheckMarkRow = { key: string; value: MarkValue; updated_at: string };

export function rowsToSnapshot(rows: CheckMarkRow[]): MarkSnapshot {
  const snapshot: MarkSnapshot = {};
  for (const row of rows) {
    snapshot[row.key] = { value: row.value, at: Date.parse(row.updated_at) };
  }
  return snapshot;
}

export const markKeySchema = z
  .string()
  .max(100)
  .regex(/^(c:[A-Za-z0-9_-]+::\d+::\d+|[qr]:[A-Za-z0-9_-]+)$/);

export const markValueSchema = z.union([z.boolean(), z.string().max(20)]);

export const markPrefixSchema = z
  .string()
  .max(100)
  .regex(/^(c:[A-Za-z0-9_-]+::|[qr]:)$/);
