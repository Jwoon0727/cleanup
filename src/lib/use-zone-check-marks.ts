"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCheckMarksAction,
  syncCheckMarksAction,
} from "@/actions/check-marks";
import {
  coalesceOps,
  MARK_EVENT,
  markChannelName,
  opTouchesKey,
  type MarkEvent,
  type MarkOp,
  type MarkSnapshot,
  type MarkValue,
} from "@/lib/check-marks";
import {
  getBrowserSupabase,
  isRealtimeConfigured,
} from "@/lib/supabase-browser";

/** live: 실시간 연결됨 / connecting: 연결 중 / disabled: 실시간 미설정 / offline: 연결 끊김 */
export type SyncStatus = "connecting" | "live" | "disabled" | "offline";

/** saved: 모두 저장됨 / saving: 저장 중 / retrying: 저장 실패, 잠시 후 자동 재시도 */
export type SaveState = "saved" | "saving" | "retrying";

type Change = { key: string; value: MarkValue | undefined; at: number };

/** 네트워크 실패 시 재시도 간격(ms). 마지막 값을 계속 쓴다. */
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000];

/** 이보다 오래된 미저장 입력은 버린다(지난 행사의 찌꺼기가 덮어쓰지 않도록). */
const OUTBOX_TTL_MS = 6 * 60 * 60 * 1000;

const outboxStorageKey = (token: string) => `zone-marks-outbox:${token}`;

function loadOutbox(token: string): MarkOp[] {
  try {
    const raw = localStorage.getItem(outboxStorageKey(token));
    if (!raw) return [];
    const stored = JSON.parse(raw) as { savedAt?: number; ops?: MarkOp[] };
    if (!Array.isArray(stored.ops) || Date.now() - (stored.savedAt ?? 0) > OUTBOX_TTL_MS) {
      localStorage.removeItem(outboxStorageKey(token));
      return [];
    }
    return stored.ops;
  } catch {
    return [];
  }
}

function saveOutbox(token: string, ops: MarkOp[]) {
  try {
    if (ops.length === 0) localStorage.removeItem(outboxStorageKey(token));
    else
      localStorage.setItem(
        outboxStorageKey(token),
        JSON.stringify({ savedAt: Date.now(), ops }),
      );
  } catch {
    // 사생활 보호 모드 등 — 메모리 대기열만으로 계속 재시도한다.
  }
}

function applyOps(draft: Record<string, MarkValue>, ops: MarkOp[]) {
  for (const op of ops) {
    if (op.t === "set") draft[op.key] = op.value;
    else for (const key of Object.keys(draft)) if (opTouchesKey(op, key)) delete draft[key];
  }
}

/**
 * 구역 체크리스트 공유 상태.
 *
 * - 내 입력은 화면에 먼저 반영하고(낙관적 업데이트) 대기열(outbox)에 넣는다.
 * - 대기열은 한 요청으로 모아 순서대로 저장한다. 네트워크가 실패하면 버리지 않고
 *   점점 간격을 늘려 재시도하며, localStorage 에도 보관해 새로고침·앱 종료 후에도 이어서 보낸다.
 * - 저장되지 않은 내 key 에는 원격 변경을 덮어쓰지 않는다(입력 중 깜빡임·되돌아감 방지).
 * - 다른 봉사자의 변경은 Realtime Broadcast 로 받고, key 별 서버 기록 시각(at)으로 옛 변경을 무시한다.
 * - 연결 직후·화면 복귀·온라인 복귀 시 전체 스냅샷으로 재동기화한다.
 */
export function useZoneCheckMarks(token: string, initial: MarkSnapshot) {
  const [marks, setMarksState] = useState<Record<string, MarkValue>>(() =>
    Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v.value])),
  );
  const [status, setStatus] = useState<SyncStatus>(
    isRealtimeConfigured ? "connecting" : "disabled",
  );
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [unsavedCount, setUnsavedCount] = useState(0);
  const [retryTick, setRetryTick] = useState(0);

  const marksRef = useRef(marks);
  const atRef = useRef<Record<string, number>>(
    Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v.at])),
  );
  /** 아직 보내지 않은 변경 */
  const queueRef = useRef<MarkOp[]>([]);
  /** 서버로 보내는 중인 변경 */
  const inFlightRef = useRef<MarkOp[] | null>(null);
  /** 수량 입력 debounce 타이머 (key → timer) */
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const initialFingerprint = JSON.stringify(initial);

  const update = useCallback(
    (fn: (draft: Record<string, MarkValue>) => void) => {
      const next = { ...marksRef.current };
      fn(next);
      marksRef.current = next;
      setMarksState(next);
    },
    [],
  );

  /** 서버에 아직 반영되지 않은 내 변경 전부(보내는 중 + 대기 + 입력 중) */
  const unsavedOps = useCallback(
    (): MarkOp[] =>
      coalesceOps([
        ...(inFlightRef.current ?? []),
        ...queueRef.current,
        ...Object.keys(timersRef.current).map(
          (key): MarkOp => ({ t: "set", key, value: marksRef.current[key] ?? "" }),
        ),
      ]),
    [],
  );

  const refreshSaveState = useCallback(() => {
    const ops = unsavedOps();
    saveOutbox(token, ops);
    setUnsavedCount(ops.length);
    setSaveState(
      ops.length === 0 ? "saved" : retryTimerRef.current ? "retrying" : "saving",
    );
  }, [token, unsavedOps]);

  const applyRemote = useCallback(
    (changes: Change[]) => {
      const unsaved = unsavedOps();
      const accepted = changes.filter(
        (c) =>
          !unsaved.some((op) => opTouchesKey(op, c.key)) &&
          c.at >= (atRef.current[c.key] ?? 0),
      );
      if (accepted.length === 0) return;
      for (const c of accepted) atRef.current[c.key] = c.at;
      update((draft) => {
        for (const c of accepted) {
          if (c.value === undefined) delete draft[c.key];
          else draft[c.key] = c.value;
        }
      });
    },
    [update, unsavedOps],
  );

  const resync = useCallback(async () => {
    try {
      const res = await getCheckMarksAction(token);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      const changes: Change[] = Object.entries(res.marks).map(([key, m]) => ({
        key,
        value: m.value,
        at: m.at,
      }));
      for (const key of Object.keys(marksRef.current)) {
        if (!(key in res.marks)) changes.push({ key, value: undefined, at: res.at });
      }
      applyRemote(changes);
    } catch {
      // 네트워크 오류 — 다음 재동기화 때 따라잡는다.
    }
  }, [token, applyRemote]);

  /** 대기열이 빌 때까지 한 번에 한 묶음씩 보낸다. 실패하면 재시도 타이머를 건다. */
  const flush = useCallback(async () => {
    while (
      !inFlightRef.current &&
      !retryTimerRef.current &&
      queueRef.current.length > 0
    ) {
      const ops = coalesceOps(queueRef.current);
      queueRef.current = [];
      inFlightRef.current = ops;
      refreshSaveState();

      const res = await syncCheckMarksAction(token, ops).catch(() => null);
      inFlightRef.current = null;

      if (res?.ok) {
        attemptRef.current = 0;
        for (const op of ops) {
          const keys =
            op.t === "set"
              ? [op.key]
              : Object.keys(atRef.current).filter((k) => opTouchesKey(op, k));
          for (const k of keys) atRef.current[k] = Math.max(atRef.current[k] ?? 0, res.at);
        }
        setError(null);
      } else if (!res || res.retry) {
        // 버리지 않고 대기열 앞에 되돌린 뒤 잠시 후 다시 보낸다.
        queueRef.current = coalesceOps([...ops, ...queueRef.current]);
        const delay = RETRY_DELAYS[Math.min(attemptRef.current, RETRY_DELAYS.length - 1)];
        attemptRef.current += 1;
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          setRetryTick((n) => n + 1);
        }, delay);
      } else {
        // 다시 보내도 성공할 수 없는 변경(제출 완료 등) — 버리고 서버 값으로 맞춘다.
        attemptRef.current = 0;
        setError(res.message);
        refreshSaveState();
        void resync();
      }
      refreshSaveState();
    }
  }, [token, refreshSaveState, resync]);

  /** 재시도 타이머가 기다리고 있으면 지금 바로 다시 보낸다(온라인·화면 복귀 시). */
  const retryNow = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
      attemptRef.current = 0;
    }
    void flush();
  }, [flush]);

  const enqueue = useCallback(
    (op: MarkOp) => {
      queueRef.current = coalesceOps([...queueRef.current, op]);
      refreshSaveState();
      void flush();
    },
    [refreshSaveState, flush],
  );

  /** 값 변경. debounceMs 를 주면 입력이 멈춘 뒤 마지막 값만 저장한다(수량 입력용). */
  const setMark = useCallback(
    (key: string, value: MarkValue, debounceMs = 0) => {
      update((draft) => {
        draft[key] = value;
      });

      const timer = timersRef.current[key];
      if (timer) clearTimeout(timer);

      if (debounceMs <= 0) {
        delete timersRef.current[key];
        enqueue({ t: "set", key, value });
        return;
      }
      timersRef.current[key] = setTimeout(() => {
        delete timersRef.current[key];
        enqueue({ t: "set", key, value: marksRef.current[key] ?? "" });
      }, debounceMs);
      refreshSaveState();
    },
    [update, enqueue, refreshSaveState],
  );

  /** 접두어가 일치하는 key 를 모두 지운다(탭 초기화). */
  const clearMarks = useCallback(
    (prefixes: readonly string[]) => {
      const op: MarkOp = { t: "clear", prefixes: [...prefixes] };
      for (const [key, timer] of Object.entries(timersRef.current)) {
        if (opTouchesKey(op, key)) {
          clearTimeout(timer);
          delete timersRef.current[key];
        }
      }
      update((draft) => applyOps(draft, [op]));
      enqueue(op);
    },
    [update, enqueue],
  );

  /** 페이지 새로고침(router.refresh) 후 서버에서 내려온 initial 과 맞춘다. 저장 안 된 내 변경은 유지. */
  useEffect(() => {
    const nextMarks = Object.fromEntries(
      Object.entries(initial).map(([k, v]) => [k, v.value]),
    );
    const nextAt = Object.fromEntries(
      Object.entries(initial).map(([k, v]) => [k, v.at]),
    );
    applyOps(nextMarks, unsavedOps());
    marksRef.current = nextMarks;
    atRef.current = nextAt;
    setMarksState(nextMarks);
    // initial 은 내용(fingerprint)이 바뀔 때만 다시 맞춘다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFingerprint, token, unsavedOps]);

  /** 지난번에 저장하지 못하고 남은 변경을 화면에 다시 반영하고 이어서 보낸다. */
  useEffect(() => {
    const stored = loadOutbox(token);
    if (stored.length === 0) return;
    queueRef.current = coalesceOps([...stored, ...queueRef.current]);
    update((draft) => applyOps(draft, stored));
    // localStorage 는 하이드레이션 뒤에만 읽을 수 있으므로 effect 에서 상태를 맞춘다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSaveState();
    void flush();
  }, [token, update, refreshSaveState, flush]);

  useEffect(() => {
    if (retryTick > 0) void flush();
  }, [retryTick, flush]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        retryNow();
        void resync();
      }
    };
    const onOnline = () => {
      retryNow();
      void resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    const cleanupListeners = () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };

    // 실시간 키가 없으면 주기적 조회 없이 화면 복귀·온라인 복귀 때만 동기화한다.
    const supabase = getBrowserSupabase();
    if (!supabase) return cleanupListeners;

    const channel = supabase
      .channel(markChannelName(token))
      .on("broadcast", { event: MARK_EVENT }, ({ payload }) => {
        const event = payload as MarkEvent;
        if (event.type === "set") {
          applyRemote([{ key: event.key, value: event.value, at: event.at }]);
        } else if (event.type === "clear") {
          applyRemote(
            event.keys.map((key) => ({ key, value: undefined, at: event.at })),
          );
        }
      })
      .subscribe((state) => {
        if (state === "SUBSCRIBED") {
          setStatus("live");
          // 연결(재연결) 전에 놓친 변경을 따라잡는다.
          void resync();
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
          setStatus("offline");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      cleanupListeners();
    };
  }, [token, applyRemote, resync, retryNow]);

  // 화면을 떠날 때 입력 중인 수량을 대기열로 옮겨 보관·전송한다.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      const ops: MarkOp[] = [];
      for (const [key, timer] of Object.entries(timers)) {
        clearTimeout(timer);
        delete timers[key];
        ops.push({ t: "set", key, value: marksRef.current[key] ?? "" });
      }
      if (ops.length > 0) {
        queueRef.current = coalesceOps([...queueRef.current, ...ops]);
        saveOutbox(token, unsavedOps());
        void flush();
      }
    };
  }, [token, unsavedOps, flush]);

  return { marks, status, error, saveState, unsavedCount, setMark, clearMarks };
}
