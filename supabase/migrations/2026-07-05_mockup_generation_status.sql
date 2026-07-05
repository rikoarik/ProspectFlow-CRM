-- ProspectFlow CRM: durable mockup generation status on audits
-- Apply AFTER 2026-07-03_mockup_html.sql.

alter table audits
  add column if not exists mockup_job_id text,
  add column if not exists mockup_generation_status text,
  add column if not exists mockup_generation_error text,
  add column if not exists mockup_generation_error_code text,
  add column if not exists mockup_generation_started_at timestamptz,
  add column if not exists mockup_generation_finished_at timestamptz;

create index if not exists audits_mockup_job_id_idx on audits(mockup_job_id);

do $$
begin
  alter table audits
    add constraint audits_mockup_generation_status_check
    check (
      mockup_generation_status is null
      or mockup_generation_status in ('queued', 'running', 'done', 'failed')
    );
exception
  when duplicate_object then null;
end $$;
