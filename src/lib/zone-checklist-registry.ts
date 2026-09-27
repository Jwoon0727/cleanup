/** 구역 전용(하드코딩) 체크리스트를 가진 구역. DB checklist_items 를 쓰지 않는다. */
const OWN_CHECKLIST_CODES = new Set(["A", "B", "C", "D", "E", "F", "G", "H"]);

export function hasOwnChecklist(code: string): boolean {
  return OWN_CHECKLIST_CODES.has(code.toUpperCase());
}
