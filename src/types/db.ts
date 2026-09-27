export const ZONE_STATUSES = ["PENDING", "SUBMITTED"] as const;

export type ZoneStatus = (typeof ZONE_STATUSES)[number];

export type Zone = {
  id: string;
  code: string;
  label: string;
  token: string;
  status: ZoneStatus;
  created_at: string;
  /** 0002_align_schema.sql 적용 후에만 존재 */
  sort_order?: number;
  updated_at?: string;
  /** 0003_single_submission_and_assignee.sql 적용 후에만 존재. 둘 다 null 이면 미지정 */
  assignee_name: string | null;
  assignee_congregation: string | null;
};

export type ChecklistItem = {
  id: string;
  zone_id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Submission = {
  id: string;
  zone_id: string;
  congregation: string;
  volunteer_name: string;
  submitted_at: string;
};

export type SubmissionItem = {
  id: string;
  submission_id: string;
  checklist_item_id: string | null;
  label_snapshot: string;
  sort_order: number;
  checked: boolean;
};

/** 제출 1건 + 항목 */
export type SubmissionDetail = Submission & {
  items: SubmissionItem[];
};

/** /test 페이지의 DB 입출력 확인용 테이블 */
export type DbTestNote = {
  id: string;
  message: string;
  created_at: string;
};
