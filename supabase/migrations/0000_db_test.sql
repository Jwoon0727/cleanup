-- DB 입출력 테스트용 테이블
create table if not exists public.db_test_notes (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

alter table public.db_test_notes enable row level security;

-- anon/authenticated 정책 없음 = 기본 거부
-- 서버에서 service role key로만 접근
