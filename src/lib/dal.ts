import "server-only";
import { cache } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  rowsToSnapshot,
  type CheckMarkRow,
  type MarkSnapshot,
} from "@/lib/check-marks";
import type {
  ChecklistItem,
  Submission,
  SubmissionDetail,
  SubmissionItem,
  Zone,
} from "@/types/db";

export const listZones = cache(async (): Promise<Zone[]> => {
  const { data, error } = await getSupabase()
    .from("zones")
    .select("*")
    .order("code", { ascending: true });

  if (error) throw new Error(`구역 목록 조회 실패: ${error.message}`);
  return (data ?? []) as Zone[];
});

export const getZoneByCode = cache(async (code: string): Promise<Zone | null> => {
  const { data, error } = await getSupabase()
    .from("zones")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(`구역 조회 실패: ${error.message}`);
  return (data as Zone | null) ?? null;
});

export const getZoneByToken = cache(async (token: string): Promise<Zone | null> => {
  const { data, error } = await getSupabase()
    .from("zones")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error) throw new Error(`구역 조회 실패: ${error.message}`);
  return (data as Zone | null) ?? null;
});

export const getChecklistItems = cache(
  async (zoneId: string): Promise<ChecklistItem[]> => {
    const { data, error } = await getSupabase()
      .from("checklist_items")
      .select("*")
      .eq("zone_id", zoneId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`체크리스트 조회 실패: ${error.message}`);
    return (data ?? []) as ChecklistItem[];
  },
);

/** 구역의 제출 1건 (없으면 null) */
export const getSubmission = cache(
  async (zoneId: string): Promise<SubmissionDetail | null> => {
    const supabase = getSupabase();

    // 0003 마이그레이션 적용 전에는 구역당 여러 건이 남아 있을 수 있으므로
    // 가장 최근 1건만 사용한다(마이그레이션 적용 후에는 항상 1건 이하).
    const { data: submissions, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("zone_id", zoneId)
      .order("submitted_at", { ascending: false })
      .limit(1);

    if (error) throw new Error(`제출 내역 조회 실패: ${error.message}`);

    const row = ((submissions ?? []) as Submission[])[0] ?? null;
    if (!row) return null;

    const { data: itemsData, error: itemsError } = await supabase
      .from("submission_items")
      .select("*")
      .eq("submission_id", row.id)
      .order("sort_order", { ascending: true });

    if (itemsError)
      throw new Error(`체크 내역 조회 실패: ${itemsError.message}`);

    return { ...row, items: (itemsData ?? []) as SubmissionItem[] };
  },
);

/** 봉사자 URL 체크리스트의 공유 체크·수량 상태 (0005 마이그레이션) */
export const getCheckMarks = cache(
  async (zoneId: string): Promise<MarkSnapshot> => {
    const { data, error } = await getSupabase()
      .from("zone_check_marks")
      .select("key, value, updated_at")
      .eq("zone_id", zoneId);

    if (error) throw new Error(`체크 상태 조회 실패: ${error.message}`);
    return rowsToSnapshot((data ?? []) as CheckMarkRow[]);
  },
);
