"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { zoneAssigneeSchema, type FormState } from "@/lib/validation";
import type { Zone } from "@/types/db";

/** 구역별 지정 제출자 설정/해제. 둘 다 빈 값이면 지정을 해제한다. */
export async function setZoneAssigneeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const code = String(formData.get("code") ?? "").toUpperCase();
  if (!code) return { ok: false, message: "잘못된 접근입니다." };

  const parsed = zoneAssigneeSchema.safeParse({
    assigneeCongregation: formData.get("assigneeCongregation") ?? "",
    assigneeName: formData.get("assigneeName") ?? "",
    contactName: formData.get("contactName") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "회중과 이름을 모두 입력하거나, 모두 비워 지정을 해제해 주세요.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = getSupabase();

  const { data: zoneData, error: zoneError } = await supabase
    .from("zones")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (zoneError) return { ok: false, message: `구역 조회 실패: ${zoneError.message}` };

  const zone = zoneData as Zone | null;
  if (!zone) return { ok: false, message: "존재하지 않는 구역입니다." };

  const isCleared = parsed.data.assigneeCongregation.length === 0;
  const contactName = parsed.data.contactName.length === 0 ? null : parsed.data.contactName;
  const contactPhone = parsed.data.contactPhone.length === 0 ? null : parsed.data.contactPhone;

  const { error } = await supabase
    .from("zones")
    .update({
      assignee_congregation: isCleared ? null : parsed.data.assigneeCongregation,
      assignee_name: isCleared ? null : parsed.data.assigneeName,
      contact_name: contactName,
      contact_phone: contactPhone,
    })
    .eq("id", zone.id);

  if (error) return { ok: false, message: `저장 실패: ${error.message}` };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/zones/${zone.code}`);
  revalidatePath(`/c/${zone.token}`);

  return {
    ok: true,
    message: isCleared ? "지정을 해제했습니다." : "저장했습니다.",
  };
}
