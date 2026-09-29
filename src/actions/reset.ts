"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import type { FormState } from "@/lib/validation";

/** 전역 리셋: 모든 구역의 제출 기록·체크 상태를 지우고 미청소로 되돌린다. 지정 제출자는 유지된다. */
export async function resetAllZonesAction(): Promise<FormState> {
  const supabase = getSupabase();

  const { data: zonesData, error: zonesError } = await supabase
    .from("zones")
    .select("id, code, token");

  if (zonesError) return { ok: false, message: `구역 조회 실패: ${zonesError.message}` };

  const zones = zonesData ?? [];
  if (zones.length === 0) {
    return { ok: false, message: "등록된 구역이 없습니다." };
  }

  const ids = zones.map((z) => z.id);

  const { error: deleteError } = await supabase
    .from("submissions")
    .delete()
    .in("zone_id", ids);

  if (deleteError)
    return { ok: false, message: `제출 기록 삭제 실패: ${deleteError.message}` };

  const { error: marksError } = await supabase
    .from("zone_check_marks")
    .delete()
    .in("zone_id", ids);

  if (marksError)
    return { ok: false, message: `체크 상태 삭제 실패: ${marksError.message}` };

  const { error: updateError } = await supabase
    .from("zones")
    .update({ status: "PENDING" })
    .in("id", ids);

  if (updateError) {
    return {
      ok: false,
      message: "리셋이 완료되지 않았습니다. 다시 시도해 주세요.",
    };
  }

  revalidatePath("/dashboard");
  for (const zone of zones) {
    revalidatePath(`/dashboard/zones/${zone.code}`);
    revalidatePath(`/c/${zone.token}`);
  }

  return { ok: true, message: `${zones.length}개 구역을 미청소로 되돌렸습니다.` };
}

/** 구역별 리셋: 이 구역의 제출 기록·체크 상태를 지우고 미청소로 되돌린다. 지정 제출자는 유지된다. */
export async function resetZoneAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const code = String(formData.get("code") ?? "").toUpperCase();
  if (!code) return { ok: false, message: "잘못된 접근입니다." };

  const supabase = getSupabase();

  const { data: zoneData, error: zoneError } = await supabase
    .from("zones")
    .select("id, code, label, token")
    .eq("code", code)
    .maybeSingle();

  if (zoneError) return { ok: false, message: `구역 조회 실패: ${zoneError.message}` };

  const zone = zoneData;
  if (!zone) return { ok: false, message: "존재하지 않는 구역입니다." };

  const { error: deleteError } = await supabase
    .from("submissions")
    .delete()
    .eq("zone_id", zone.id);

  if (deleteError)
    return { ok: false, message: `제출 기록 삭제 실패: ${deleteError.message}` };

  const { error: marksError } = await supabase
    .from("zone_check_marks")
    .delete()
    .eq("zone_id", zone.id);

  if (marksError)
    return { ok: false, message: `체크 상태 삭제 실패: ${marksError.message}` };

  const { error: updateError } = await supabase
    .from("zones")
    .update({ status: "PENDING" })
    .eq("id", zone.id);

  if (updateError) {
    return {
      ok: false,
      message: "리셋이 완료되지 않았습니다. 다시 시도해 주세요.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/zones/${zone.code}`);
  revalidatePath(`/c/${zone.token}`);

  return { ok: true, message: `${zone.label} 을 미청소로 되돌렸습니다.` };
}
