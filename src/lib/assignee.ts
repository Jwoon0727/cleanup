import type { Zone } from "@/types/db";

/** 공백 제거 + 대소문자 무시 비교용 정규화 */
function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

/** 구역에 지정 제출자가 있는지 */
export function hasAssignee(zone: Zone): boolean {
  return Boolean(zone.assignee_name && zone.assignee_congregation);
}

/** 입력한 회중·이름이 지정 제출자와 일치하는지. 미지정이면 항상 true */
export function isAssignedSubmitter(
  zone: Zone,
  input: { congregation: string; volunteerName: string },
): boolean {
  if (!hasAssignee(zone)) return true;

  return (
    normalize(zone.assignee_congregation!) === normalize(input.congregation) &&
    normalize(zone.assignee_name!) === normalize(input.volunteerName)
  );
}
