-- 한 번에 실행: 스키마 생성 + A~H 시드 + 확인 쿼리
-- Supabase Dashboard > SQL Editor > New query 에 붙여넣고 Run

-- ========== 1. 스키마 ==========

-- /test 페이지용 DB 테스트 테이블
create table if not exists public.db_test_notes (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

alter table public.db_test_notes enable row level security;

create or replace function public.new_zone_token()
returns text
language sql
volatile
as $$
  select substr(
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
    1,
    32
  );
$$;

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  token text not null unique default public.new_zone_token(),
  status text not null default 'PENDING',
  assignee_name text,
  assignee_congregation text,
  created_at timestamptz not null default now(),
  constraint zones_code_check check (code ~ '^[A-H]$'),
  constraint zones_status_check check (
    status in ('PENDING', 'SUBMITTED')
  )
);

create index if not exists zones_status_idx on public.zones (status);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones (id) on delete cascade,
  label text not null,
  sort_order int not null,
  is_active boolean not null default true,
  constraint checklist_items_label_check check (char_length(trim(label)) > 0),
  constraint checklist_items_sort_order_check check (sort_order >= 0),
  unique (zone_id, sort_order)
);

create index if not exists checklist_items_zone_id_idx on public.checklist_items (zone_id);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones (id) on delete cascade,
  round int not null default 1,
  congregation text not null,
  volunteer_name text not null,
  submitted_at timestamptz not null default now(),
  constraint submissions_round_check check (round >= 1),
  constraint submissions_congregation_check check (char_length(trim(congregation)) > 0),
  constraint submissions_volunteer_name_check check (char_length(trim(volunteer_name)) > 0),
  unique (zone_id)
);

create index if not exists submissions_zone_id_idx on public.submissions (zone_id);

create table if not exists public.submission_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  checklist_item_id uuid references public.checklist_items (id) on delete set null,
  label_snapshot text not null,
  sort_order int not null default 0,
  checked boolean not null,
  constraint submission_items_label_snapshot_check check (char_length(trim(label_snapshot)) > 0),
  constraint submission_items_sort_order_check check (sort_order >= 0)
);

create index if not exists submission_items_submission_id_idx
  on public.submission_items (submission_id);

create index if not exists submission_items_sort_idx
  on public.submission_items (submission_id, sort_order);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  admin_id uuid not null references public.admins (id),
  result text not null,
  memo text,
  created_at timestamptz not null default now(),
  constraint inspections_result_check check (result in ('APPROVED', 'REWORK'))
);

create index if not exists inspections_submission_id_idx on public.inspections (submission_id);
create index if not exists inspections_admin_id_idx on public.inspections (admin_id);

alter table public.admins enable row level security;
alter table public.zones enable row level security;
alter table public.checklist_items enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_items enable row level security;
alter table public.inspections enable row level security;

-- ========== 2. 시드 (A~H) ==========

insert into public.zones (code, label, token)
select
  chr(ascii('A') + series.i)::text as code,
  chr(ascii('A') + series.i)::text || '구역' as label,
  public.new_zone_token() as token
from generate_series(0, 7) as series(i)
where not exists (select 1 from public.zones limit 1);

insert into public.checklist_items (zone_id, label, sort_order)
select
  z.id,
  item.label,
  item.sort_order
from public.zones z
cross join (
  values
    ('바닥 청소 완료', 1),
    ('책상·의자 정리 완료', 2),
    ('창문·유리 닦기 완료', 3),
    ('쓰레기 분리·수거 완료', 4),
    ('화장실 청소 완료', 5)
) as item(label, sort_order)
where not exists (
  select 1
  from public.checklist_items ci
  where ci.zone_id = z.id
);

-- ========== 3. 확인 ==========

select code, label, status, token
from public.zones
order by code;

select z.code, count(ci.id) as checklist_count
from public.zones z
left join public.checklist_items ci on ci.zone_id = z.id
group by z.code
order by z.code;
