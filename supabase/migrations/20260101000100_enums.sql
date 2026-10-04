-- M0: enums from PLAN § 7.1
create type public.user_role as enum ('admin','subadmin','technician','client');
create type public.company_status as enum ('invited','pending_approval','active','rejected','no_account');
create type public.report_status as enum ('draft','pending_signature','signature_expired','finalized','cancelled');
create type public.version_status as enum ('official','pending_client_approval','rejected','superseded');
create type public.end_state as enum ('functional','stopped_pending_parts');
create type public.signature_mode as enum ('onsite','remote');
create type public.token_purpose as enum ('remote_signature','edit_approval');
create type public.token_status as enum ('active','used','expired','revoked');
create type public.job_status as enum ('pending','ok','failed');
