"use client";

import {
  type ChecklistGroup,
  type CleaningTool,
  type ZoneChecklistConfig,
} from "@/components/zone-checklist";

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

const duringSessionGroups: ChecklistGroup[] = [
  {
    title: "1층 청중석 전체",
    hint: "청소도구 : 손걸레",
    items: ["화장실 쓰레기통 비우기 및 화장지 확인"],
  },
];

const afterMeetingGroups: ChecklistGroup[] = [
  {
    title: "1층 연단(사회자실, 연사대기실, 확성실, 화장실, 창고1)",
    hint: "청소도구 : 진공청소기(연단쪽 창고에 있음), 손걸레, 변기솔, 세제",
    items: [
      "연단 및 대기실 쪽, 복도 카페트 진공청소기",
      "정수기 물통 비우기",
      "쓰레기통 비우기",
      "테이블/연탁 등 손걸레",
    ],
  },
  {
    title: "1층 청중석 전체",
    hint: "청소도구 : 손걸레",
    items: ["청중석 의자 손걸레", "바닥 쓰레기 줍기"],
  },
];

export const ZONE_D_CONFIG: ZoneChecklistConfig = {
  headerTitle: "청소 체크리스트 (D구역)",
  areaDescription: "담당구역: D구역",
  footerNote:
    "* 체크·수량 입력은 같은 구역 봉사자 모두에게 실시간으로 공유됩니다. 청소가 끝나면 청소부 요원에게 결과를 알려주세요.",
  checklistStorageKey: "zone-d-checklist-v1",
  cleaningTools: CLEANING_TOOLS,
  defaultTabKey: "session",
  tabGridClass: "grid grid-cols-2 gap-1.5 sm:grid-cols-3",
  tabs: [
    {
      kind: "checklist",
      key: "session",
      label: "1. 회기 중",
      short: "회기 중",
      groups: duringSessionGroups,
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
