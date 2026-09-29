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

const afterMeetingGroups: ChecklistGroup[] = [
  {
    title: "1층 로비 및 현관유리 출입구. 복도. 안내데스크",
    hint: "청소도구 : 진공청소기, 손걸레, 유리세정제, 빗자루, 대걸레",
    items: [
      "로비 카페트 청소기",
      "현관 유리 닦기",
      "테이블 닦기",
      "바닥 빗자루 및 대걸레질",
    ],
  },
  {
    title: "지층/2층 계단(중앙 2곳, 서편/동편 각각 1곳)",
    hint: "청소 도구 : 빗자루, 대걸레",
    items: ["바닥 빗자루 및 대걸레질"],
  },
  {
    title: "외부",
    hint: "청소 도구 : 집게, 쓰레기 봉투",
    items: ["외부 주차장 쓰레기 줍기"],
  },
];

const afterFullCleaningGroups: ChecklistGroup[] = [
  {
    title: "외부",
    hint: "청소도구 : 집게, 쓰레기 봉투",
    items: ["쓰레기 분리수거 및 쓰레기 배출", "적치장 정리"],
  },
];

export const ZONE_C_CONFIG: ZoneChecklistConfig = {
  headerTitle: "청소 체크리스트 (C구역)",
  areaDescription: "담당구역: C구역",
  footerNote:
    "* 체크·수량 입력은 같은 구역 봉사자 모두에게 실시간으로 공유됩니다.",
  checklistStorageKey: "zone-c-checklist-v1",
  cleaningTools: CLEANING_TOOLS,
  defaultTabKey: "meetEnd",
  tabGridClass: "grid grid-cols-2 gap-1.5 sm:grid-cols-3",
  tabs: [
    {
      kind: "checklist",
      key: "meetEnd",
      label: "1. 대회 마친 후",
      short: "대회 마친 후",
      groups: afterMeetingGroups,
    },
    {
      kind: "checklist",
      key: "fullCleanEnd",
      label: "2. 전체 청소 마친 후",
      short: "전체 청소 후",
      groups: afterFullCleaningGroups,
    },
    {
      kind: "supplies",
      key: "supplies",
      label: "청소도구 수량",
      short: "도구 수량",
    },
  ],
};
