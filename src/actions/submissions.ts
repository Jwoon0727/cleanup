"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { submissionSchema, type FormState } from "@/lib/validation";
import { canVolunteerSubmit } from "@/lib/zone-status";
import { isAssignedSubmitter } from "@/lib/assignee";
import { checklistFieldName } from "@/lib/checklist";
import { hasOwnChecklist } from "@/lib/zone-checklist-registry";
import type { Zone } from "@/types/db";

/**
 * 봉사자 체크리스트 제출.
 *
 * 클라이언트의 제출 버튼 비활성화는 UX 일 뿐이므로,
 * "모든 항목 체크 + 회중 + 이름" 규칙을 여기서 다시 검증한다.
 */
export async function submitChecklistAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { ok: false, message: "잘못된 접근입니다." };

  const supabase = getSupabase();

  const { data: zoneData, error: zoneError } = await supabase
    .from("zones")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (zoneError) return { ok: false, message: `구역 조회 실패: ${zoneError.message}` };

  const zone = zoneData as Zone | null;
  if (!zone) return { ok: false, message: "존재하지 않는 구역입니다." };

  if (!canVolunteerSubmit(zone.status)) {
    return {
      ok: false,
      message: "이미 제출이 완료된 구역입니다.",
    };
  }

  const parsed = submissionSchema.safeParse({
    congregation: formData.get("congregation"),
    volunteerName: formData.get("volunteerName"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "회중과 이름을 모두 입력해 주세요.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!isAssignedSubmitter(zone, parsed.data)) {
    return { ok: false, message: "제출 권한이 없습니다." };
  }

  // A·B 구역은 구역 전용(하드코딩) 체크리스트를 쓴다. DB checklist_items 조회/전부-체크
  // 검증 없이 회중·이름만으로 제출을 받는다.
  const ownChecklist = hasOwnChecklist(zone.code);
  let items: { id: string; label: string; sort_order: number }[] = [];

  if (!ownChecklist) {
    const { data: itemsData, error: itemsError } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("zone_id", zone.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (itemsError)
      return { ok: false, message: `체크리스트 조회 실패: ${itemsError.message}` };

    items = itemsData ?? [];
    if (items.length === 0) {
      return { ok: false, message: "이 구역에는 등록된 체크리스트 항목이 없습니다." };
    }

    const unchecked = items.filter(
      (item) => formData.get(checklistFieldName(item.id)) === null,
    );

    if (unchecked.length > 0) {
      return {
        ok: false,
        message: `체크되지 않은 항목이 ${unchecked.length}개 있습니다. 모두 확인해 주세요.`,
      };
    }
  }

  // 동시 제출 방지: 현재 상태가 그대로일 때만 상태를 선점한다.
  const { data: claimed, error: claimError } = await supabase
    .from("zones")
    .update({ status: "SUBMITTED" })
    .eq("id", zone.id)
    .eq("status", zone.status)
    .select("id");

  if (claimError)
    return { ok: false, message: `상태 변경 실패: ${claimError.message}` };

  if (!claimed || claimed.length === 0) {
    return {
      ok: false,
      message: "방금 다른 분이 제출을 완료했습니다. 화면을 새로고침해 주세요.",
    };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({
      zone_id: zone.id,
      congregation: parsed.data.congregation,
      volunteer_name: parsed.data.volunteerName,
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    // 선점한 상태를 되돌린다.
    await supabase.from("zones").update({ status: zone.status }).eq("id", zone.id);
    return {
      ok: false,
      message: `제출 실패: ${submissionError?.message ?? "알 수 없는 오류"}`,
    };
  }

  if (!ownChecklist) {
    const { error: itemInsertError } = await supabase.from("submission_items").insert(
      items.map((item) => ({
        submission_id: submission.id,
        checklist_item_id: item.id,
        label_snapshot: item.label,
        sort_order: item.sort_order,
        checked: true,
      })),
    );

    if (itemInsertError) {
      await supabase.from("submissions").delete().eq("id", submission.id);
      await supabase.from("zones").update({ status: zone.status }).eq("id", zone.id);
      return { ok: false, message: `제출 실패: ${itemInsertError.message}` };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/zones/${zone.code}`);
  revalidatePath(`/c/${token}`);

  return { ok: true, message: "제출이 완료되었습니다. 수고하셨습니다!" };
}
