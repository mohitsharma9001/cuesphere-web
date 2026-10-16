-- A TV can show every live table in turn instead of one table:
-- table_number 0 means "all tables (rotate)".
alter table public.tv_screens drop constraint if exists tv_screens_table_number_check;
alter table public.tv_screens add constraint tv_screens_table_number_check check (table_number between 0 and 99);
