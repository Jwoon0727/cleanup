"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseAdmin,
  getSupabaseConfigStatus,
} from "@/lib/supabase";
import type { DbTestNote } from "@/types/db";

export type DbTestState = {
  ok: boolean;
  message: string;
};

const TEST_PATH = "/test";

export async function getDbTestNotes(): Promise<{
  notes: DbTestNote[];
  error: string | null;
}> {
  const config = getSupabaseConfigStatus();

  if (!config.isReady) {
    return {
      notes: [],
      error: "Supabase 환경 변수가 설정되지 않았습니다.",
    };
  }

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("db_test_notes")
      .select("id, message, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return { notes: [], error: error.message };
    }

    return { notes: data ?? [], error: null };
  } catch (error) {
    return {
      notes: [],
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    };
  }
}

export async function createDbTestNote(
  _prevState: DbTestState,
  formData: FormData,
): Promise<DbTestState> {
  const message = String(formData.get("message") ?? "").trim();

  if (!message) {
    return { ok: false, message: "메시지를 입력해 주세요." };
  }

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase
      .from("db_test_notes")
      .insert({ message });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath(TEST_PATH);
    return { ok: true, message: "저장되었습니다." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "저장에 실패했습니다.",
    };
  }
}

export async function deleteDbTestNote(
  _prevState: DbTestState,
  formData: FormData,
): Promise<DbTestState> {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { ok: false, message: "삭제할 항목 ID가 없습니다." };
  }

  try {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase
      .from("db_test_notes")
      .delete()
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath(TEST_PATH);
    return { ok: true, message: "삭제되었습니다." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "삭제에 실패했습니다.",
    };
  }
}
