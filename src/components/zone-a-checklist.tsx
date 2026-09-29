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

const frequentGroups: ChecklistGroup[] = [
  {
    title: "지하 식당1",
    hint: "청소 도구 : 빗자루, 쓰레받이, 대걸레, 손걸레",
    items: ["정수기 물통 비우기", "쓰레기통 비우기"],
  },
];

const afterBaptismGroups: ChecklistGroup[] = [
  {
    title: "지하 탈의실(남, 여), 침례장",
    hint: "청소방법 : 대걸레, 스퀴지, 손걸레",
    items: ["탈의실 청소", "침례장 물기 제거"],
  },
];

const afterMeetingGroups: ChecklistGroup[] = [
  {
    title: "지하 로비+복도",
    hint: "청소도구 : 빗자루, 쓰레받이, 대걸레",
    items: ["바닥 빗자루 및 대걸레질"],
  },
  {
    title: "지하 식당1",
    hint: "청소도구 : 빗자루, 쓰레받이, 대걸레, 손걸레",
    items: [
      "정수기 물통 비우기",
      "쓰레기통 비우기",
      "식당 테이블 닦기",
      "바닥 빗자루 및 대걸레질",
    ],
  },
  {
    title: "지하 창고3, 창고5(비품관리)",
    hint: "청소 도구 : 스퀴지, 대걸레",
    items: ["비품 분출"],
  },
];

const afterFullCleaningGroups: ChecklistGroup[] = [
  {
    title: "지하 창고4, 창고5(비품관리)",
    hint: "청소 도구 : 스퀴지, 대걸레",
    items: ["창고 정리 및 비품 확인"],
  },
];

export const ZONE_A_CONFIG: ZoneChecklistConfig = {
  headerTitle: "청소 체크리스트 (충청6나)",
  areaDescription:
    "담당구역: A구역 · 지하 탈의실(남/여), 침례장, 지하 로비+복도, 지하 식당1, 지하 창고3·4, 창고5(비품관리)",
  footerNote:
    "* 체크·수량 입력은 같은 구역 봉사자 모두에게 실시간으로 공유됩니다. 청소가 끝나면 청소부 요원(김현철 형제, 010-5329-2792)에게 결과를 알려주세요.",
  checklistStorageKey: "zone-a-checklist-v1",
  cleaningTools: CLEANING_TOOLS,
  defaultTabKey: "frequent",
  tabGridClass: "grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5",
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
      key: "baptism",
      label: "2. 침례를 마친 후",
      short: "침례 후",
      groups: afterBaptismGroups,
    },
    {
      kind: "checklist",
      key: "meetEnd",
      label: "3. 대회 마친 후",
      short: "대회 마친 후",
      groups: afterMeetingGroups,
    },
    {
      kind: "checklist",
      key: "fullCleanEnd",
      label: "4. 전체 청소 마친 후",
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
