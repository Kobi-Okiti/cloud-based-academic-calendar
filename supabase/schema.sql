-- Academic Calendar MVP Schema (simple)

create extension if not exists "uuid-ossp";

-- Enums
create type role_type as enum ('admin', 'staff', 'student');
create type approval_status as enum ('pending', 'approved', 'rejected');
create type event_category as enum ('exam', 'test_week', 'holiday', 'seminar', 'general', 'announcement');
create type audience_scope as enum ('everyone', 'students', 'staff');
create type notification_channel as enum ('email', 'in_app');
create type notification_status as enum ('scheduled', 'sent', 'failed');

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role role_type not null default 'student',
  status approval_status not null default 'pending',
  full_name text not null default '',
  email text,
  level int,
  department text,
  matric_number text,
  staff_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_matric_number_unique
  on profiles (matric_number)
  where matric_number is not null;

create unique index if not exists profiles_staff_id_unique
  on profiles (staff_id)
  where staff_id is not null;

-- Academic sessions
create table if not exists academic_sessions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Events
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references academic_sessions(id) on delete set null,
  title text not null,
  description text,
  category event_category not null default 'general',
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  location text,
  audience_scope audience_scope not null default 'everyone',
  audience_level int,
  is_urgent boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audience_level_check check (
    (audience_scope <> 'students' and audience_level is null)
    or (audience_scope = 'students' and (audience_level in (100, 200, 300, 400, 500) or audience_level is null))
  )
);

-- Notification rules (e.g., 7 days + 1 day)
create table if not exists notification_rules (
  id uuid primary key default uuid_generate_v4(),
  rule_key text not null,
  offset_minutes int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists notification_rules_key_unique
  on notification_rules (rule_key);

-- Notification preferences
create table if not exists notification_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  channel notification_channel not null,
  status notification_status not null default 'scheduled',
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  read_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

-- Updated_at triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
before update on profiles
for each row execute function public.set_updated_at();

create trigger set_events_updated_at
before update on events
for each row execute function public.set_updated_at();

create trigger set_notification_preferences_updated_at
before update on notification_preferences
for each row execute function public.set_updated_at();

-- Auto-create profile and preferences on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email, 'student', 'pending');

  insert into public.notification_preferences (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Minimal RLS
alter table profiles enable row level security;
alter table events enable row level security;
alter table notification_preferences enable row level security;
alter table notifications enable row level security;

create policy "profiles_read_own" on profiles
for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;

create policy "prefs_own" on notification_preferences
for select using (user_id = auth.uid());

create policy "prefs_update_own" on notification_preferences
for update using (user_id = auth.uid());

create policy "notifications_read_own" on notifications
for select using (user_id = auth.uid());

-- Seed default notification rules
insert into notification_rules (rule_key, offset_minutes)
values ('7_days_before', -10080), ('1_day_before', -1440)
on conflict (rule_key) do nothing;

-- Safe profile update RPC (prevents role/status escalation)
create or replace function public.update_profile(
  p_full_name text,
  p_role role_type,
  p_level int,
  p_department text,
  p_matric_number text,
  p_staff_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('student', 'staff') then
    raise exception 'Invalid role';
  end if;

  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'Full name is required';
  end if;

  if p_department is null or length(trim(p_department)) < 2 then
    raise exception 'Department is required';
  end if;

  if p_role = 'student' then
    if p_level is null or p_level not in (100, 200, 300, 400, 500) then
      raise exception 'Invalid level';
    end if;

    if p_matric_number is null or length(trim(p_matric_number)) < 1 then
      raise exception 'Matric number is required';
    end if;
  end if;

  if p_role = 'staff' then
    if p_staff_id is null or length(trim(p_staff_id)) < 1 then
      raise exception 'Staff ID is required';
    end if;
  end if;

  update profiles
  set
    full_name = trim(p_full_name),
    role = p_role,
    level = case when p_role = 'student' then p_level else null end,
    department = trim(p_department),
    matric_number = case when p_role = 'student' then trim(p_matric_number) else null end,
    staff_id = case when p_role = 'staff' then trim(p_staff_id) else null end
  where id = auth.uid();
end;
$$;

grant execute on function public.update_profile(
  text,
  role_type,
  int,
  text,
  text,
  text
) to authenticated;
