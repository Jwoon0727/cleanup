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

/** 클라이언트가 모아 두었다가 한 번에 보내는 저장 단위. 순서대로 적용된다. */
export type MarkOp =
  | { t: "set"; key: string; value: MarkValue }
  | { t: "clear"; prefixes: string[] };

export const markOpsSchema = z
  .array(
    z.discriminatedUnion("t", [
      z.object({ t: z.literal("set"), key: markKeySchema, value: markValueSchema }),
      z.object({ t: z.literal("clear"), prefixes: markPrefixSchema.array().min(1).max(5) }),
    ]),
  )
  .min(1)
  .max(200);

export const opTouchesKey = (op: MarkOp, key: string) =>
  op.t === "set" ? op.key === key : op.prefixes.some((p) => key.startsWith(p));

/**
 * 같은 결과를 내는 더 짧은 목록으로 줄인다.
 * 뒤의 set/clear 가 덮어쓰는 앞의 set 은 보낼 필요가 없다.
 */
export function coalesceOps(ops: MarkOp[]): MarkOp[] {
  const out: MarkOp[] = [];
  for (const op of ops) {
    for (let i = out.length - 1; i >= 0; i--) {
      const prev = out[i];
      if (prev.t === "set" && opTouchesKey(op, prev.key)) out.splice(i, 1);
    }
    out.push(op);
  }
  return out;
}
