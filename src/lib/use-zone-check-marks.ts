"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearCheckMarksAction,
  getCheckMarksAction,
  setCheckMarkAction,
} from "@/actions/check-marks";
import {
  MARK_EVENT,
  markChannelName,
  type MarkEvent,
  type MarkSnapshot,
  type MarkValue,
} from "@/lib/check-marks";
import {
  getBrowserSupabase,
  isRealtimeConfigured,
} from "@/lib/supabase-browser";

/** live: 실시간 연결됨 / connecting: 연결 중 / disabled: 실시간 미설정 / offline: 연결 끊김 */
export type SyncStatus = "connecting" | "live" | "disabled" | "offline";

type Change = { key: string; value: MarkValue | undefined; at: number };

const SAVE_ERROR = "저장하지 못했습니다. 네트워크 연결을 확인해 주세요.";

/**
 * 구역 체크리스트 공유 상태.
 *
 * - 내 입력은 화면에 먼저 반영하고(낙관적 업데이트) 서버 액션으로 저장한다.
 * - 다른 봉사자의 변경은 Realtime Broadcast 로 받는다.
 * - 저장이 끝나지 않은 내 key 에는 원격 변경을 덮어쓰지 않는다(입력 중 깜빡임 방지).
 * - key 별 서버 기록 시각(at)으로 늦게 도착한 옛 변경을 무시한다.
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

  const marksRef = useRef(marks);
  const atRef = useRef<Record<string, number>>(
    Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v.at])),
  );
  const pendingRef = useRef<Record<string, number>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const update = useCallback(
    (fn: (draft: Record<string, MarkValue>) => void) => {
      const next = { ...marksRef.current };
      fn(next);
      marksRef.current = next;
      setMarksState(next);
    },
    [],
  );

  const hold = (key: string) => {
    pendingRef.current[key] = (pendingRef.current[key] ?? 0) + 1;
  };

  const release = (key: string, at?: number) => {
    const left = (pendingRef.current[key] ?? 1) - 1;
    if (left > 0) pendingRef.current[key] = left;
    else delete pendingRef.current[key];
    if (at !== undefined) {
      atRef.current[key] = Math.max(atRef.current[key] ?? 0, at);
    }
  };

  const applyRemote = useCallback(
    (changes: Change[]) => {
      const accepted = changes.filter(
        (c) => !pendingRef.current[c.key] && c.at >= (atRef.current[c.key] ?? 0),
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
    [update],
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

  const send = useCallback(
    (key: string, value: MarkValue) => {
      setCheckMarkAction(token, key, value)
        .then((res) => {
          if (res.ok) {
            release(key, res.at);
            setError(null);
          } else {
            release(key);
            setError(res.message);
            void resync();
          }
        })
        .catch(() => {
          release(key);
          setError(SAVE_ERROR);
        });
    },
    [token, resync],
  );

  /** 값 변경. debounceMs 를 주면 입력이 멈춘 뒤 마지막 값만 저장한다(수량 입력용). */
  const setMark = useCallback(
    (key: string, value: MarkValue, debounceMs = 0) => {
      update((draft) => {
        draft[key] = value;
      });

      const timer = timersRef.current[key];
      if (timer) clearTimeout(timer);
      else hold(key);

      if (debounceMs <= 0) {
        delete timersRef.current[key];
        send(key, value);
        return;
      }
      timersRef.current[key] = setTimeout(() => {
        delete timersRef.current[key];
        send(key, marksRef.current[key] ?? "");
      }, debounceMs);
    },
    [update, send],
  );

  /** 접두어가 일치하는 key 를 모두 지운다(탭 초기화). */
  const clearMarks = useCallback(
    (prefixes: readonly string[]) => {
      const matches = (key: string) => prefixes.some((p) => key.startsWith(p));
      const keys = Object.keys(marksRef.current).filter(matches);

      for (const key of keys) {
        const timer = timersRef.current[key];
        if (timer) {
          clearTimeout(timer);
          delete timersRef.current[key];
          release(key);
        }
        hold(key);
      }
      update((draft) => {
        for (const key of keys) delete draft[key];
      });

      clearCheckMarksAction(token, [...prefixes])
        .then((res) => {
          for (const key of keys) release(key, res.ok ? res.at : undefined);
          if (res.ok) setError(null);
          else {
            setError(res.message);
            void resync();
          }
        })
        .catch(() => {
          for (const key of keys) release(key);
          setError(SAVE_ERROR);
        });
    },
    [token, update, resync],
  );

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void resync();
    };
    const onOnline = () => void resync();
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
  }, [token, applyRemote, resync]);

  // 화면을 떠날 때 대기 중인 수량 입력을 바로 저장한다.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const [key, timer] of Object.entries(timers)) {
        clearTimeout(timer);
        delete timers[key];
        void setCheckMarkAction(token, key, marksRef.current[key] ?? "");
      }
    };
  }, [token]);

  return { marks, status, error, setMark, clearMarks };
}
