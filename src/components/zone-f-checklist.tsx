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
    title: "1층 동편 화장실(남, 여)",
    hint: "청소 도구 : 손걸레, 변기솔, 세제, 대걸레",
    items: ["쓰레기통 비우기 및 화장지 확인"],
  },
];

const afterLunchGroups: ChecklistGroup[] = [
  {
    title: "1층 동편 식당+부서사무실",
    hint: "청소도구 : 손걸레, 빗자루, 쓰레받이, 대걸레",
    items: ["정수기 물통 비우기", "쓰레기통 비우기"],
  },
];

const afterMeetingGroups: ChecklistGroup[] = [
  {
    title: "1층 동편 식당+부서사무실",
    hint: "청소도구 : 손걸레, 빗자루, 쓰레받이, 대걸레",
    items: [
      "정수기 물통 비우기",
      "쓰레기통 비우기",
      "식당 테이블 닦기",
      "식당 바닥 빗자루 및 대걸레질",
      "부서사무실 책상 닦기",
      "부서사무실 바닥 빗자루 및 대걸레질",
    ],
  },
  {
    title: "1층 동편 화장실(남, 여)",
    hint: "청소도구 : 손걸레, 변기솔, 세제, 대걸레",
    items: ["세면대", "변기 청소", "바닥 대걸레질"],
  },
];

export const ZONE_F_CONFIG: ZoneChecklistConfig = {
  headerTitle: "청소 체크리스트 (F구역)",
  areaDescription: "담당구역: F구역",
  footerNote:
    "* 체크·수량 입력은 같은 구역 봉사자 모두에게 실시간으로 공유됩니다.",
  checklistStorageKey: "zone-f-checklist-v1",
  cleaningTools: CLEANING_TOOLS,
  defaultTabKey: "session",
  tabGridClass: "grid grid-cols-2 gap-1.5 sm:grid-cols-4",
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
      key: "lunch",
      label: "2. 점심 시간 후",
      short: "점심 후",
      groups: afterLunchGroups,
    },
    {
      kind: "checklist",
      key: "meetEnd",
      label: "3. 대회 마친 후",
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
