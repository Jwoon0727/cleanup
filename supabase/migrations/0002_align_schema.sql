-- setup-all.sql 로 만든 스키마를 애플리케이션 코드에 맞춰 보정한다.
-- Supabase Dashboard > SQL Editor 에 붙여넣고 실행. 여러 번 실행해도 안전하다.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. [필수] 제출 항목의 표시 순서 스냅샷
--    이 컬럼이 없으면 봉사자 체크리스트 제출이 실패한다.
-- ---------------------------------------------------------------------------
alter table public.submission_items
  add column if not exists sort_order int not null default 0;

create index if not exists submission_items_sort_idx
  on public.submission_items (submission_id, sort_order);

-- ---------------------------------------------------------------------------
-- 2. [보안] anon / authenticated 권한 회수
--    봉사자는 로그인이 없으므로 브라우저에서 Supabase 를 직접 호출하지 않는다.
--    모든 접근은 서버 측 service role 로만 이루어진다.
-- ---------------------------------------------------------------------------
revoke all on public.admins           from anon, authenticated;
revoke all on public.zones            from anon, authenticated;
revoke all on public.checklist_items  from anon, authenticated;
revoke all on public.submissions      from anon, authenticated;
revoke all on public.submission_items from anon, authenticated;
revoke all on public.inspections      from anon, authenticated;
revoke all on public.db_test_notes    from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. [보안] 더 강한 봉사자 URL 토큰 (base64url 24 bytes = 192bit)
--    기존 new_zone_token() 은 uuid 기반 32자 hex(128bit).
--    이후 새로 발급되는 토큰에 적용된다.
-- ---------------------------------------------------------------------------
create or replace function public.generate_zone_token()
returns text
language sql
volatile
as $$
  select rtrim(translate(encode(gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
$$;

alter table public.zones
  alter column token set default public.generate_zone_token();

create index if not exists zones_token_idx on public.zones (token);

-- ---------------------------------------------------------------------------
-- 4. [이력 보존] 체크리스트 항목이나 관리자 계정이 삭제되어도
--    제출·검사 이력 자체는 남아야 한다.
-- ---------------------------------------------------------------------------
alter table public.submission_items alter column checklist_item_id drop not null;
alter table public.inspections      alter column admin_id          drop not null;

alter table public.submission_items
  drop constraint if exists submission_items_checklist_item_id_fkey;
alter table public.submission_items
  add constraint submission_items_checklist_item_id_fkey
  foreign key (checklist_item_id) references public.checklist_items (id)
  on delete set null;

alter table public.inspections
  drop constraint if exists inspections_admin_id_fkey;
alter table public.inspections
  add constraint inspections_admin_id_fkey
  foreign key (admin_id) references public.admins (id)
  on delete set null;

create index if not exists inspections_submission_created_idx
  on public.inspections (submission_id, created_at desc);

-- 발급된 봉사자 URL 확인
-- select code, '/c/' || token as url from public.zones order by code;
