-- Supabase Database Schema for "Queue Cure"

-- 1. Create the settings table (single-row tracking for global state)
create table if not exists settings (
  id int primary key check (id = 1),
  current_serving_token int not null default 0,
  avg_consultation_time int not null default 15 check (avg_consultation_time > 0)
);

-- Seed initial settings if not exists
insert into settings (id, current_serving_token, avg_consultation_time)
values (1, 0, 15)
on conflict (id) do nothing;

-- 2. Create the queue table
create table if not exists queue (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  token_number serial unique,
  doctor_name text not null default 'TEST',
  status text not null default 'waiting' check (status in ('waiting', 'in-consultation', 'completed')),
  created_at timestamp with time zone not null default now()
);

-- 3. Enable real-time updates for both tables
begin;
  -- Add tables to the realtime publication
  alter publication supabase_realtime add table queue;
  alter publication supabase_realtime add table settings;
commit;
