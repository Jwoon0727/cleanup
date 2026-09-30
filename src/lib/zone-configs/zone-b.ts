import {
  type ChecklistGroup,
  type CleaningTool,
  type ZoneChecklistConfig,
} from "@/lib/zone-checklist-types";

const CLEANING_TOOLS: readonly CleaningTool[] = [
  { id: "glass-cleaner", label: "유리세정제" },
  { id: "cloth-glass", label: "걸레 (유리용)" },
  { id: "cloth-gray", label: "걸레 (회색)" },
  { id: "cloth-blue", label: "걸레 (파란색)" },
  { id: "table-cleaner", label: "테이블 글리너" },
  { id: "broom", label: "빗자루" },
  { id: "dustpan", label: "쓰레기받기" },
  { id: "oil-mop", label: "기름걸레" },
  { id: "vacuum", label: "진공청소기" },
  { id: "urinal-cleaner", label: "소변기 전용 세제" },
  { id: "squeegee", label: "스퀴지" },
  { id: "toilet-brush", label: "변기솔" },
];

const frequentGroups: ChecklistGroup[] = [
  {
    title: "지하 식당2",
    hint: "청소도구 : 빗자루, 쓰레받이, 대걸레",
    items: ["정수기 물통 비우기", "쓰레기통 비우기"],
  },
  {
    title: "지하 화장실(남, 여)",
    hint: "청소도구 : 손걸레, 변기솔, 세제, 대걸레",
    items: ["청결상태 확인", "쓰레기통", "화장지 확인"],
  },
];

const afterMeetingGroups: ChecklistGroup[] = [
  {
    title: "지하 식당2",
    hint: "청소도구 : 빗자루, 쓰레받이, 대걸레, 손걸레",
    items: [
      "정수기 물통 비우기",
      "쓰레기통 비우기",
      "식당 테이블 닦기",
      "바닥 빗자루 및 대걸레질",
    ],
  },
  {
    title: "지하 복도",
    hint: "청소도구 : 빗자루, 쓰레받이, 대걸레",
    items: ["바닥 빗자루 및 대걸레질"],
  },
  {
    title: "지하 화장실(남, 여)",
    hint: "청소도구 : 손걸레, 변기솔, 세제, 대걸레",
    items: ["세면대", "변기 청소", "바닥 대걸레질"],
  },
];

export const ZONE_B_CONFIG: ZoneChecklistConfig = {
  headerTitle: "청소 체크리스트 (B구역)",
  areaDescription: "담당구역: B구역",
  footerNote:
    "* 체크·수량 입력은 같은 구역 봉사자 모두에게 실시간으로 공유됩니다.",
  checklistStorageKey: "zone-b-checklist-v1",
  cleaningTools: CLEANING_TOOLS,
  defaultTabKey: "frequent",
  tabGridClass: "grid grid-cols-2 gap-1.5 sm:grid-cols-3",
  tabs: [
    {
      kind: "checklist",
      key: "frequent",
      label: "1. 수시로",
      short: "수시로",
      groups: frequentGroups,
    },
    {
      kind: "checklist",
      key: "meetEnd",
      label: "2. 대회 마친 후",
      short: "대회 마친 후",
      groups: afterMeetingGroups,
    },
    {
      kind: "supplies",
      key: "supplies",
      label: "청소도구 수량",
      short: "도구 수량",
    },
  ],
};
