-- ProspectFlow CRM: mockup HTML persistence on audits
-- Apply AFTER 2026-07-03_auth_rls.sql.

alter table audits
  add column if not exists mockup_html text,
  add column if not exists mockup_fallback boolean not null default false,
  add column if not exists mockup_generated_at timestamptz;

create index if not exists audits_mockup_generated_at_idx on audits(mockup_generated_at);