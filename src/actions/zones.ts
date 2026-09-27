"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { getSupabase } from "@/lib/supabase";
import type { FormState } from "@/lib/validation";

/** 구역 URL 이 유출되었을 때 토큰을 새로 발급한다(기존 URL 은 즉시 무효). */
export async function rotateZoneTokenAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const code = String(formData.get("code") ?? "").toUpperCase();
  if (!code) return { ok: false, message: "잘못된 접근입니다." };

  const token = randomBytes(24).toString("base64url");

  const { error } = await getSupabase()
    .from("zones")
    .update({ token })
    .eq("code", code);

  if (error) return { ok: false, message: `토큰 재발급 실패: ${error.message}` };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/zones/${code}`);

  return { ok: true, message: "새 URL 이 발급되었습니다. 기존 URL 은 더 이상 동작하지 않습니다." };
}
