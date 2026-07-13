-- HeliServiX OS — Database schema (PostgreSQL / Supabase)
--
-- This replaces the HSV OS 0.2/0.3 browser-localStorage MVP with a real,
-- shared source of truth. Two structural problems from the old app are
-- fixed at the database level instead of in fragile frontend logic:
--
--   1. Duplicate components on re-import: a UNIQUE constraint on
--      (helicopter_registration, part_number, serial_number) means an
--      import can only ever "upsert", never create a duplicate row.
--
--   2. Duplicate open maintenance alerts (the "111 alerts for 43
--      components" bug seen in HSV OS 0.3): a partial UNIQUE index
--      guarantees at most one OPEN alert per component + alert type.
--      A trigger — not scattered app code — is the single place that
--      creates/updates/resolves alerts.
--
-- Run this against a fresh Supabase project (SQL Editor > New query).

create extension if not exists "pgcrypto";

-- ========================================================================
-- Vessels
-- ========================================================================

create table vessels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner text,
  country text,
  home_port text,
  capacity_tons numeric,
  campaign text,
  status text not null default 'Prospect'
    check (status in ('Prospect','Active','Inactive','Archived')),
  notes text,
  archived boolean not null default false,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========================================================================
-- Helicopters
-- ========================================================================
-- Assignment lives in ONE place (here), not mirrored on both the
-- helicopter and the vessel. That two-way sync in the old app was a
-- second source of the "numbers don't match what I entered" complaints.

create table helicopters (
  registration text primary key,
  model text not null,
  serial_number text,
  manufacture_year text,
  manufacture_date date,
  last_review_date date,
  current_hourmeter numeric not null default 0,
  status text not null default 'Available'
    check (status in ('Available','Assigned','In Campaign','Maintenance','Grounded','Retired')),
  owner_company text,
  assigned_vessel_id uuid references vessels(id) on delete set null,
  operation_area text,
  base text,
  notes text,
  readiness numeric not null default 100,
  archived boolean not null default false,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_helicopters_assigned_vessel on helicopters(assigned_vessel_id);

-- ========================================================================
-- Components
-- ========================================================================

create table components (
  id uuid primary key default gen_random_uuid(),
  helicopter_registration text not null references helicopters(registration) on delete cascade,
  category text,
  component_name text not null,
  part_number text not null default '',
  serial_number text not null default '',
  position text,
  installation_date date,
  tsn_hours numeric not null default 0,
  tso_hours numeric not null default 0,
  life_limit_hours numeric not null default 0,
  remaining_hours numeric not null default 0,
  calendar_limit_date date,
  remaining_calendar_days integer,
  remaining_percentage numeric not null default 0,
  status text not null default 'OK'
    check (status in ('OK','Monitor','Critical','Expired','Removed')),
  notes text,
  document_count integer not null default 0,
  archived boolean not null default false,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The fix for duplicate components on repeated Excel imports: the
  -- same physical part on the same aircraft can only exist once while
  -- active. Re-importing the same row UPDATES this row instead of
  -- creating a new one with a fresh id.
  unique (helicopter_registration, part_number, serial_number)
);

create index idx_components_helicopter on components(helicopter_registration);
create index idx_components_status on components(status) where archived = false;

-- Recalculate remaining_percentage and status server-side, once, instead
-- of in five different places in the frontend.
--
-- Status is the WORSE of two independent readings: hours remaining and
-- calendar days remaining. A component can have 90% of its life left in
-- hours but still be a month from its calendar expiry (e.g. a part with a
-- 12-year calendar limit that just doesn't fly much) — that must surface
-- as Critical/Monitor too, not get hidden behind a healthy hours number.
-- Components with no calendar limit at all (LIFE / ON CONDITION / N/A —
-- remaining_calendar_days is null) are judged on hours only.
create or replace function recalculate_component_fields()
returns trigger as $$
declare
  hours_status text;
  calendar_status text;
begin
  if new.status = 'Removed' then
    return new;
  end if;

  new.remaining_percentage := case
    when new.life_limit_hours <= 0 then 0
    else greatest(0, least(100, (new.remaining_hours / new.life_limit_hours) * 100))
  end;

  hours_status := case
    when new.remaining_hours <= 0 or new.remaining_percentage <= 0 then 'Expired'
    when new.remaining_percentage < 10 then 'Critical'
    when new.remaining_percentage <= 25 then 'Monitor'
    else 'OK'
  end;

  calendar_status := case
    when new.remaining_calendar_days is null then 'OK'
    when new.remaining_calendar_days <= 0 then 'Expired'
    when new.remaining_calendar_days < 90 then 'Critical'
    when new.remaining_calendar_days <= 180 then 'Monitor'
    else 'OK'
  end;

  new.status := case
    when hours_status = 'Expired' or calendar_status = 'Expired' then 'Expired'
    when hours_status = 'Critical' or calendar_status = 'Critical' then 'Critical'
    when hours_status = 'Monitor' or calendar_status = 'Monitor' then 'Monitor'
    else 'OK'
  end;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_recalculate_component_fields
  before insert or update of remaining_hours, life_limit_hours, remaining_calendar_days
  on components
  for each row execute function recalculate_component_fields();

-- ========================================================================
-- Maintenance alerts
-- ========================================================================

create table maintenance_alerts (
  id uuid primary key default gen_random_uuid(),
  helicopter_registration text not null references helicopters(registration) on delete cascade,
  component_id uuid references components(id) on delete cascade,
  component_name text,
  alert_type text not null,
  severity text not null check (severity in ('Info','Monitor','Critical','Grounding')),
  trigger_basis text check (trigger_basis in ('Hours','Calendar','Data','Forecast')),
  remaining_hours numeric,
  remaining_calendar_days integer,
  due_date date,
  assigned_to text,
  status text not null default 'Open'
    check (status in ('Open','Acknowledged','In Progress','Resolved')),
  description text,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The direct fix for the "111 open alerts on 43 components" bug: the
-- database will not allow a second OPEN alert of the same type on the
-- same component to exist, full stop.
create unique index uq_open_alert_per_component_type
  on maintenance_alerts (component_id, alert_type)
  where status <> 'Resolved';

create index idx_alerts_helicopter_open on maintenance_alerts(helicopter_registration) where status <> 'Resolved';

-- One trigger owns alert lifecycle: open/update the alert when a
-- component becomes Monitor/Critical/Expired, auto-resolve it when the
-- component goes back to OK. No app code has to remember to do this.
create or replace function reconcile_component_alert()
returns trigger as $$
declare
  computed_severity text;
  computed_alert_type text;
  hours_status text;
  calendar_status text;
  computed_basis text;
begin
  if new.status in ('Monitor','Critical','Expired') then
    computed_alert_type := new.status || ' component threshold';
    computed_severity := case new.status
      when 'Expired' then 'Grounding'
      when 'Critical' then 'Critical'
      else 'Monitor'
    end;

    -- Mirror recalculate_component_fields' hours-vs-calendar comparison so the
    -- alert says WHY it fired: a component can be Critical purely because its
    -- calendar limit is near even though it has plenty of hours left.
    hours_status := case
      when new.remaining_hours <= 0 or new.remaining_percentage <= 0 then 'Expired'
      when new.remaining_percentage < 10 then 'Critical'
      when new.remaining_percentage <= 25 then 'Monitor'
      else 'OK'
    end;
    calendar_status := case
      when new.remaining_calendar_days is null then 'OK'
      when new.remaining_calendar_days <= 0 then 'Expired'
      when new.remaining_calendar_days < 90 then 'Critical'
      when new.remaining_calendar_days <= 180 then 'Monitor'
      else 'OK'
    end;
    computed_basis := case when calendar_status = new.status then 'Calendar' else 'Hours' end;

    insert into maintenance_alerts (
      helicopter_registration, component_id, component_name, alert_type,
      severity, trigger_basis, remaining_hours, remaining_calendar_days,
      due_date, assigned_to, status, description, source
    ) values (
      new.helicopter_registration, new.id, new.component_name, computed_alert_type,
      computed_severity,
      computed_basis,
      new.remaining_hours, new.remaining_calendar_days, new.calendar_limit_date,
      'Maintenance Chief', 'Open',
      new.component_name || ' is ' || new.status || ' (' || computed_basis || '). ' ||
        new.remaining_hours::text || ' hrs remaining, ' ||
        coalesce(new.remaining_calendar_days::text || ' calendar days remaining', 'no calendar limit') || '.',
      new.source
    )
    on conflict (component_id, alert_type) where status <> 'Resolved'
    do update set
      severity = excluded.severity,
      remaining_hours = excluded.remaining_hours,
      remaining_calendar_days = excluded.remaining_calendar_days,
      due_date = excluded.due_date,
      description = excluded.description,
      updated_at = now();

    -- Resolve any stale open alert of a different type for this component
    -- (e.g. it was Monitor, is now Critical: keep one alert, not two).
    update maintenance_alerts
      set status = 'Resolved', updated_at = now()
      where component_id = new.id
        and alert_type <> computed_alert_type
        and status <> 'Resolved';
  else
    -- Component is OK or Removed: resolve any open alerts for it.
    update maintenance_alerts
      set status = 'Resolved', updated_at = now()
      where component_id = new.id and status <> 'Resolved';
  end if;

  return new;
end;
$$ language plpgsql;

-- Deliberately NOT "update of status": the app never sets `status` directly
-- (recalculate_component_fields owns it, as a BEFORE trigger). Postgres only
-- fires an "OF column_list" trigger when that column is an explicit target of
-- the client's UPDATE statement — a BEFORE trigger changing NEW.status
-- internally does not count. With "of status" here, this trigger silently
-- never re-fired when a component's status changed as a side effect of an
-- hours/calendar update, so alerts never auto-resolved once the underlying
-- problem was fixed (they just sat there forever, e.g. "Expired, 0.0 hrs"
-- long after the component showed healthy hours). Firing on every
-- insert/update is safe: the function is cheap and idempotent.
create trigger trg_reconcile_component_alert
  after insert or update on components
  for each row execute function reconcile_component_alert();

-- ========================================================================
-- Flight logs (also deducts component hours — see function below)
-- ========================================================================

create table flight_logs (
  id uuid primary key default gen_random_uuid(),
  helicopter_registration text not null references helicopters(registration) on delete cascade,
  vessel_id uuid references vessels(id),
  campaign_id uuid,
  marea_code text,
  week_number integer,
  flight_date date not null,
  pilot text,
  mechanic text,
  hobbs_start numeric not null,
  hobbs_end numeric not null,
  flight_hours numeric generated always as (greatest(0, hobbs_end - hobbs_start)) stored,
  -- Self-reported from the weekly report's "Consumo combustible/aceite" row.
  -- Structured columns (not just text in `notes`) so AVGAS consumption can be
  -- summed/aggregated per aircraft, vessel, or year for the annual report.
  fuel_consumption_gals numeric,
  oil_consumption_qts numeric,
  notes text,
  approval_status text not null default 'Approved' check (approval_status in ('Draft','Submitted','Approved')),
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  check (hobbs_end >= hobbs_start)
);

-- Prevents importing the same weekly report (marea + week) twice for the same
-- aircraft, which would otherwise double-deduct hours from every component via
-- trg_apply_flight_log. Only enforced when both fields are present (manual flight
-- log entries with no marea/week are unaffected).
create unique index idx_flight_logs_unique_week
  on flight_logs(helicopter_registration, marea_code, week_number)
  where marea_code is not null and week_number is not null;

create index idx_flight_logs_helicopter on flight_logs(helicopter_registration);

-- Applying a flight log updates the hourmeter and deducts hours from
-- every active component on that aircraft, in one transaction.
create or replace function apply_flight_log()
returns trigger as $$
begin
  update helicopters
    set current_hourmeter = greatest(current_hourmeter, new.hobbs_end),
        updated_at = now()
    where registration = new.helicopter_registration;

  update components
    set remaining_hours = greatest(0, remaining_hours - new.flight_hours),
        tso_hours = tso_hours + new.flight_hours
    where helicopter_registration = new.helicopter_registration
      and status <> 'Removed'
      and archived = false;

  return new;
end;
$$ language plpgsql;

create trigger trg_apply_flight_log
  after insert on flight_logs
  for each row execute function apply_flight_log();

-- ========================================================================
-- Replacement events / maintenance logs / component changes
-- ========================================================================

create table replacement_events (
  id uuid primary key default gen_random_uuid(),
  helicopter_registration text not null references helicopters(registration) on delete cascade,
  removed_component text,
  installed_component text,
  removal_date date,
  installation_date date,
  removal_hourmeter numeric,
  installation_hourmeter numeric,
  reason text,
  approved_by text,
  notes text,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now()
);

create table maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  helicopter_registration text not null references helicopters(registration) on delete cascade,
  log_date date,
  maintenance_type text not null,
  -- Aircraft hourmeter reading at the time of this event. Needed (not just
  -- nice-to-have) so the scheduled-inspection view can compute "next 100 HRS
  -- due at X" from history instead of parsing free-text notes.
  hourmeter numeric,
  description text,
  technician text,
  related_component_id uuid references components(id),
  action_taken text,
  evidence_placeholder text,
  notes text,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now()
);

create index idx_maintenance_logs_helicopter_type on maintenance_logs(helicopter_registration, maintenance_type, log_date desc);

create table component_changes (
  id uuid primary key default gen_random_uuid(),
  helicopter_registration text not null references helicopters(registration) on delete cascade,
  removed_component_id uuid references components(id),
  removed_component_name text,
  installed_component_name text,
  installed_part_number text,
  installed_serial_number text,
  removal_date date,
  installation_date date,
  reason text,
  technician text,
  supporting_document_placeholder text,
  notes text,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now()
);

-- ========================================================================
-- Inventory / purchasing
-- ========================================================================

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid references vessels(id),
  storage_location text,
  item_type text not null default 'Other'
    check (item_type in ('Component','Hardware','Consumable','Oil','Filter','Tool','Kit','Other')),
  item_name text not null,
  part_number text,
  serial_number text,
  lot_batch text,
  quantity numeric not null default 0,
  unit_of_measure text default 'ea',
  minimum_stock numeric not null default 0,
  condition text,
  expiration_date date,
  related_helicopter text references helicopters(registration),
  notes text,
  archived boolean not null default false,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('Received','Transferred','Used','Installed','Consumed','Adjusted')),
  from_location text,
  to_location text,
  quantity numeric not null check (quantity > 0),
  movement_date date not null default current_date,
  related_maintenance_event text,
  notes text,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now()
);

create or replace function apply_stock_movement()
returns trigger as $$
begin
  update inventory_items
    set quantity = case
          when new.movement_type in ('Used','Installed','Consumed','Transferred')
            then greatest(0, quantity - new.quantity)
          else quantity + new.quantity
        end,
        updated_at = now()
    where id = new.inventory_item_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_apply_stock_movement
  after insert on stock_movements
  for each row execute function apply_stock_movement();

create table purchase_requests (
  id uuid primary key default gen_random_uuid(),
  supplier text not null,
  item_name text not null,
  part_number text,
  quantity numeric not null check (quantity > 0),
  unit_cost numeric not null default 0,
  currency text not null default 'USD',
  related_helicopter text references helicopters(registration),
  related_vessel_id uuid references vessels(id),
  related_campaign_id uuid,
  related_maintenance_event text,
  status text not null default 'Requested'
    check (status in ('Requested','Quoted','Approved','Ordered','Received','Shipped to vessel','Stored','Installed','Consumed','Closed')),
  attachments_placeholder text,
  notes text,
  archived boolean not null default false,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========================================================================
-- Personnel (Recursos Humanos)
-- ========================================================================
-- Pilots and mechanics as real records instead of free-text names on
-- campaigns/flight_logs, so a faena can be assigned to a specific person and
-- that person's own pay terms (monthly_salary, rate_per_ton) can drive the
-- payroll calculation. Contract terms vary per person — there is no single
-- fleet-wide rate — so these are plain nullable numeric columns filled in
-- per person, not constants in code.
create table personnel (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null check (role in ('Piloto','Mecánico')),
  monthly_salary numeric,
  rate_per_ton numeric,
  phone text,
  -- Links this person to their Supabase Auth login for the Portal Técnico
  -- (see lib/auth.ts) — Adolfo fills this in once per person, matching
  -- whatever email he used to create their login in the Supabase dashboard.
  email text,
  notes text,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  archived boolean not null default false,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_personnel_email on personnel (lower(email)) where email is not null;

-- ========================================================================
-- Campaigns
-- ========================================================================

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  client_fleet_owner text,
  vessel_id uuid references vessels(id),
  helicopter_registration text references helicopters(registration),
  pilot text,
  mechanic text,
  pilot_id uuid references personnel(id),
  mechanic_id uuid references personnel(id),
  start_date date,
  end_date date,
  operation_area text,
  contract_reference text,
  status text not null default 'Draft'
    check (status in ('Draft','Planned','Readiness Review','Approved','Active','Suspended','Completed','Cancelled','Archived')),
  -- Catch data: the weekly report template has a spot for this, but crews
  -- rarely fill it in on the field, so the office enters it manually once
  -- the faena closes. "Estimate" is what's radioed in during the marea;
  -- "final" is the official cannery weigh-in — the payroll ton-bonus (see
  -- personnel.rate_per_ton) is calculated on "final", not "estimate".
  tons_captured_estimate numeric,
  tons_captured_final numeric,
  fishing_days numeric,
  catch_weighin_date date,
  -- Historical/manual total flight hours for a faena that predates
  -- flight_logs tracking (e.g. bulk-loaded from an office spreadsheet).
  -- Deliberately NOT inserted as flight_logs rows: that table's
  -- trg_apply_flight_log trigger deducts hours from whatever components are
  -- CURRENTLY installed, which is wrong for hours flown in the past on
  -- possibly-different components. Used by the Faenas summary/detail pages
  -- as a fallback only when no flight_logs are linked to the campaign.
  total_flight_hours numeric,
  -- Ad hoc cash advances given outside the standard 80% ton-bonus advance
  -- (e.g. the crew asked for extra cash mid-marea) — netted against the
  -- final settlement, matching how the office's own payroll sheet tracks
  -- "Anticipos" separately from the formula-driven 80/20 split.
  pilot_anticipos numeric,
  mechanic_anticipos numeric,
  notes text,
  archived boolean not null default false,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table flight_logs add constraint fk_flight_logs_campaign foreign key (campaign_id) references campaigns(id);
alter table purchase_requests add constraint fk_purchase_campaign foreign key (related_campaign_id) references campaigns(id);

-- ========================================================================
-- Technical records / compliance
-- ========================================================================

create table technical_records (
  id uuid primary key default gen_random_uuid(),
  record_type text not null
    check (record_type in ('8130','Logbook page','Work order','Invoice','Photo','Certificate','Release to service','Inspection','Other')),
  related_helicopter text references helicopters(registration),
  related_component_id uuid references components(id),
  related_maintenance_event uuid references maintenance_logs(id),
  related_campaign_id uuid references campaigns(id),
  related_purchase_id uuid references purchase_requests(id),
  title text not null,
  record_date date,
  document_number text,
  notes text,
  attachment_placeholder text,
  archived boolean not null default false,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now()
);

-- due_hours: absolute target hourmeter reading for compliance items that come
-- due by usage rather than calendar (e.g. Robinson's 2200-hour inspection kit
-- for R44 Raven I/Clipper I). Only meaningful when related_helicopter is set --
-- an hourmeter target only makes sense against one specific aircraft's
-- current_hourmeter. due_date and due_hours can both be set (whichever comes
-- first governs); either can be left null.
create table compliance_items (
  id uuid primary key default gen_random_uuid(),
  authority text not null check (authority in ('AAC Panama','DGAC Ecuador','FAA','Robinson','Other')),
  compliance_type text not null check (compliance_type in ('AD','SB','Service Letter','Manual Revision','Operational Requirement','Life Limit')),
  reference_number text,
  title text not null,
  effective_date date,
  due_date date,
  due_hours numeric,
  applicability text,
  related_helicopter text references helicopters(registration),
  related_component_id uuid references components(id),
  status text not null default 'Not reviewed'
    check (status in ('Not reviewed','Applicable','Not applicable','In progress','Complied','Overdue')),
  notes text,
  attachment_placeholder text,
  archived boolean not null default false,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table compliance_alerts (
  id uuid primary key default gen_random_uuid(),
  compliance_item_id uuid not null references compliance_items(id) on delete cascade,
  related_helicopter text references helicopters(registration),
  related_component_id uuid references components(id),
  related_campaign_id uuid references campaigns(id),
  severity text not null check (severity in ('Info','Monitor','Critical','Grounding')),
  status text not null default 'Open' check (status in ('Open','Acknowledged','In Progress','Resolved')),
  due_date date,
  description text,
  source text not null default 'User' check (source in ('Demo','User')),
  created_at timestamptz not null default now(),
  unique (compliance_item_id, status)
);

-- ========================================================================
-- Aircraft migration (Excel import) audit log
-- ========================================================================

create table migration_logs (
  id uuid primary key default gen_random_uuid(),
  migration_id text not null,
  migration_date timestamptz not null default now(),
  performed_by text,
  workbook text,
  aircraft text[],
  components_imported integer not null default 0,
  components_updated integer not null default 0,
  components_replaced integer not null default 0,
  warnings integer not null default 0,
  errors integer not null default 0,
  duration_ms integer,
  source text not null default 'User' check (source in ('Demo','User'))
);

-- ========================================================================
-- Row Level Security
-- ========================================================================
-- MVP posture: no login exists yet (matches HSV OS 0.2/0.3's own
-- documented "Authentication is not active" limitation), so policies
-- grant access to both `anon` and `authenticated` for now. Once
-- Supabase Auth is wired up for you / your maintenance chief / pilots,
-- replace `anon, authenticated` below with role-checked policies per
-- the Administrator / Maintenance Chief roles already described in
-- docs/HSV-SPEC-002_MAINTENANCE_CREW_PORTAL.md.

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'vessels','helicopters','components','maintenance_alerts','flight_logs',
      'replacement_events','maintenance_logs','component_changes','inventory_items',
      'stock_movements','purchase_requests','campaigns','technical_records',
      'compliance_items','compliance_alerts','migration_logs','personnel'
    ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('create policy %I_open_access on %I for all to anon, authenticated using (true) with check (true);', t, t);
  end loop;
end $$;
