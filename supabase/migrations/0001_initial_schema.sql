-- ============================================================
-- JusticeHub — 0001_initial_schema.sql
-- Creates all core tables, constraints, indexes, and triggers.
-- Apply via Supabase SQL editor or `supabase db push`.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. FIRM
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS firm (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  plan_tier  text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- 2. USER PROFILE (extends auth.users)
-- ─────────────────────────────────────────
-- role values: 'firm_admin' | 'staff' | 'client'
-- email lives in auth.users — do not duplicate here.
CREATE TABLE IF NOT EXISTS user_profile (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id    uuid NOT NULL REFERENCES firm(id) ON DELETE CASCADE,
  full_name  text NOT NULL,
  role       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_profile_role_check
    CHECK (role IN ('firm_admin', 'staff', 'client'))
);

CREATE INDEX IF NOT EXISTS user_profile_firm_id_idx ON user_profile(firm_id);
CREATE INDEX IF NOT EXISTS user_profile_role_idx    ON user_profile(firm_id, role);

-- ─────────────────────────────────────────
-- 3. CLIENT
-- ─────────────────────────────────────────
-- auth_user_id is NULL until the portal invite is accepted.
CREATE TABLE IF NOT EXISTS client (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id        uuid NOT NULL REFERENCES firm(id) ON DELETE CASCADE,
  name           text NOT NULL,
  email          text NOT NULL,
  phone          text,
  portal_access  boolean NOT NULL DEFAULT false,
  auth_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT client_firm_email_unique UNIQUE (firm_id, email)
);

CREATE INDEX IF NOT EXISTS client_firm_id_idx      ON client(firm_id);
CREATE INDEX IF NOT EXISTS client_auth_user_id_idx ON client(auth_user_id);

-- ─────────────────────────────────────────
-- 4. CASE
-- ─────────────────────────────────────────
-- status values: 'intake' | 'active' | 'awaiting_court' | 'closed'
CREATE TABLE IF NOT EXISTS "case" (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id          uuid NOT NULL REFERENCES firm(id) ON DELETE CASCADE,
  client_id        uuid NOT NULL REFERENCES client(id) ON DELETE RESTRICT,
  title            text NOT NULL,
  matter_type      text NOT NULL,
  status           text NOT NULL DEFAULT 'intake',
  assigned_user_id uuid REFERENCES user_profile(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT case_status_check
    CHECK (status IN ('intake', 'active', 'awaiting_court', 'closed'))
);

CREATE INDEX IF NOT EXISTS case_firm_id_idx        ON "case"(firm_id);
CREATE INDEX IF NOT EXISTS case_client_id_idx      ON "case"(client_id);
CREATE INDEX IF NOT EXISTS case_assigned_user_idx  ON "case"(assigned_user_id);
CREATE INDEX IF NOT EXISTS case_status_idx         ON "case"(firm_id, status);

-- ─────────────────────────────────────────
-- 5. DOCUMENT
-- ─────────────────────────────────────────
-- firm_id is denormalised for direct RLS evaluation without joins.
-- storage_path is the Supabase Storage object path (bucket/path).
CREATE TABLE IF NOT EXISTS document (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  firm_id           uuid NOT NULL REFERENCES firm(id) ON DELETE CASCADE,
  filename          text NOT NULL,
  storage_path      text NOT NULL,
  tag               text,
  visible_to_client boolean NOT NULL DEFAULT false,
  uploaded_by       uuid REFERENCES user_profile(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_case_id_idx ON document(case_id);
CREATE INDEX IF NOT EXISTS document_firm_id_idx ON document(firm_id);

-- ─────────────────────────────────────────
-- 6. CASE EVENT (court dates / deadlines)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_event (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  firm_id           uuid NOT NULL REFERENCES firm(id) ON DELETE CASCADE,
  title             text NOT NULL,
  event_date        date NOT NULL,
  visible_to_client boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_event_case_id_idx  ON case_event(case_id);
CREATE INDEX IF NOT EXISTS case_event_firm_id_idx  ON case_event(firm_id);
CREATE INDEX IF NOT EXISTS case_event_date_idx     ON case_event(firm_id, event_date);

-- ─────────────────────────────────────────
-- 7. NOTE (internal only — never client-visible)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS note (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id    uuid NOT NULL REFERENCES "case"(id) ON DELETE CASCADE,
  firm_id    uuid NOT NULL REFERENCES firm(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES user_profile(id) ON DELETE SET NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS note_case_id_idx ON note(case_id);
CREATE INDEX IF NOT EXISTS note_firm_id_idx ON note(firm_id);

-- ─────────────────────────────────────────
-- 8. AUDIT LOG (PRD §9 — every status change / upload logged)
-- ─────────────────────────────────────────
-- Inserts handled server-side via service role only.
-- action examples: 'case.status_changed', 'document.uploaded',
--                  'case_event.created', 'client.invited'
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id     uuid NOT NULL REFERENCES firm(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_firm_id_idx   ON audit_log(firm_id);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx    ON audit_log(firm_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(firm_id, created_at DESC);

-- ─────────────────────────────────────────
-- 9. TRIGGERS
-- ─────────────────────────────────────────

-- Auto-update `updated_at` on case rows
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS case_updated_at ON "case";
CREATE TRIGGER case_updated_at
  BEFORE UPDATE ON "case"
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Auto-create audit log entry on case status change
CREATE OR REPLACE FUNCTION log_case_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log (firm_id, actor_id, action, entity_type, entity_id, payload)
    VALUES (
      NEW.firm_id,
      auth.uid(),
      'case.status_changed',
      'case',
      NEW.id,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS case_status_audit ON "case";
CREATE TRIGGER case_status_audit
  AFTER UPDATE ON "case"
  FOR EACH ROW
  EXECUTE FUNCTION log_case_status_change();
