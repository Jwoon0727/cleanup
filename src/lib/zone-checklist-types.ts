export type CleaningTool = { id: string; label: string };

/** 체크 항목. `note` 는 라벨 아래 보조 안내 */
export type ChecklistItem =
  | string
  | { label: string; note?: string };

export type ChecklistGroup = {
  title: string;
  hint?: string;
  items: ChecklistItem[];
};

export function checklistItemLabel(item: ChecklistItem): string {
  return typeof item === "string" ? item : item.label;
}

export function checklistItemNote(item: ChecklistItem): string | undefined {
  return typeof item === "string" ? undefined : item.note;
}

export type ChecklistTabDef = {
  kind: "checklist";
  key: string;
  label: string;
  short: string;
  groups: ChecklistGroup[];
};

export type SuppliesTabDef = {
  kind: "supplies";
  key: "supplies";
  label: string;
  short: string;
};

export type ZoneTabDef = ChecklistTabDef | SuppliesTabDef;

export type ZoneChecklistConfig = {
  headerTitle: string;
  areaDescription: string;
  footerNote: string;
  /** 입력 id 접두어용 구역 식별자 */
  checklistStorageKey: string;
  cleaningTools: readonly CleaningTool[];
  tabs: ZoneTabDef[];
  defaultTabKey: string;
  /** Tailwind grid classes for tab buttons */
  tabGridClass?: string;
};
