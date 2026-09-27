-- 제출 1회 확정 + 구역별 지정 제출자.
-- Supabase Dashboard > SQL Editor 에 붙여넣고 실행.

-- 1) 구역별 지정 제출자. 둘 다 null 이면 미지정(누구나 제출 가능).
alter table public.zones
  add column if not exists assignee_name text,
  add column if not exists assignee_congregation text;

-- 2) 상태 단순화: PENDING / SUBMITTED
update public.zones set status = 'SUBMITTED' where status in ('APPROVED', 'RESUBMITTED');
update public.zones set status = 'PENDING'   where status = 'REWORK';
alter table public.zones drop constraint if exists zones_status_check;
alter table public.zones add  constraint zones_status_check
  check (status in ('PENDING', 'SUBMITTED'));

-- 3) 구역당 제출 1건. round 는 항상 1.
alter table public.submissions alter column round set default 1;

-- [주의] 아래 2줄은 기존 재제출(2차 이상) 이력을 삭제합니다.
delete from public.submissions where round > 1;
create unique index if not exists submissions_zone_id_key on public.submissions (zone_id);

-- 4) inspections 는 코드에서 더 이상 사용하지 않는다(테이블은 남겨 과거 기록 보존).
--    완전히 지우려면 아래 주석을 해제해 실행:
-- drop table if exists public.inspections;
