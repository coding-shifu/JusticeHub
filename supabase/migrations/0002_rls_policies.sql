-- ============================================================
-- JusticeHub — 0002_rls_policies.sql
-- Row-Level Security: every table scoped by firm_id.
-- Three roles: firm_admin | staff | client
-- ============================================================

-- ─────────────────────────────────────────
-- HELPER FUNCTIONS
-- Stable SQL functions avoid repeated subqueries in every policy.
-- ─────────────────────────────────────────

-- Returns the firm_id of the currently authenticated staff/admin user.
-- Returns NULL for clients (they have no user_profile row).
CREATE OR REPLACE FUNCTION my_firm_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT firm_id
  FROM user_profile
  WHERE id = auth.uid()
    AND role IN ('firm_admin', 'staff')
$$;

-- Returns the client.id for the currently authenticated client user.
-- Returns NULL for staff/admin.
CREATE OR REPLACE FUNCTION my_client_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id
  FROM client
  WHERE auth_user_id = auth.uid()
$$;

-- Returns true if the current user has role = 'firm_admin' in their firm.
CREATE OR REPLACE FUNCTION is_firm_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profile
    WHERE id = auth.uid() AND role = 'firm_admin'
  )
$$;

-- ─────────────────────────────────────────
-- 1. FIRM
-- ─────────────────────────────────────────
ALTER TABLE firm ENABLE ROW LEVEL SECURITY;

-- Staff/admin: read their own firm only
CREATE POLICY "firm: staff read own firm"
  ON firm FOR SELECT
  USING (id = my_firm_id());

-- Firm admin: update their own firm's details
CREATE POLICY "firm: admin update own firm"
  ON firm FOR UPDATE
  USING (id = my_firm_id() AND is_firm_admin())
  WITH CHECK (id = my_firm_id() AND is_firm_admin());

-- INSERT and DELETE handled exclusively by server-side service-role key.

-- ─────────────────────────────────────────
-- 2. USER PROFILE
-- ─────────────────────────────────────────
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

-- All staff can see profiles in their firm
CREATE POLICY "user_profile: staff read same-firm"
  ON user_profile FOR SELECT
  USING (firm_id = my_firm_id());

-- Any staff member can update their own profile
CREATE POLICY "user_profile: self update"
  ON user_profile FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Firm admin: full CRUD on staff profiles within their firm
CREATE POLICY "user_profile: admin full access"
  ON user_profile FOR ALL
  USING (firm_id = my_firm_id() AND is_firm_admin())
  WITH CHECK (firm_id = my_firm_id() AND is_firm_admin());

-- ─────────────────────────────────────────
-- 3. CLIENT
-- ─────────────────────────────────────────
ALTER TABLE client ENABLE ROW LEVEL SECURITY;

-- Staff: read all clients belonging to their firm
CREATE POLICY "client: staff read same-firm"
  ON client FOR SELECT
  USING (firm_id = my_firm_id());

-- Staff: create clients for their firm
CREATE POLICY "client: staff insert"
  ON client FOR INSERT
  WITH CHECK (firm_id = my_firm_id());

-- Staff: update clients in their firm
CREATE POLICY "client: staff update"
  ON client FOR UPDATE
  USING (firm_id = my_firm_id())
  WITH CHECK (firm_id = my_firm_id());

-- Admin only: delete clients
CREATE POLICY "client: admin delete"
  ON client FOR DELETE
  USING (firm_id = my_firm_id() AND is_firm_admin());

-- Client: can read their own record only
CREATE POLICY "client: self read"
  ON client FOR SELECT
  USING (auth_user_id = auth.uid());

-- ─────────────────────────────────────────
-- 4. CASE
-- ─────────────────────────────────────────
ALTER TABLE "case" ENABLE ROW LEVEL SECURITY;

-- Staff/admin: full access to cases within their firm
CREATE POLICY "case: staff full access"
  ON "case" FOR ALL
  USING (firm_id = my_firm_id())
  WITH CHECK (firm_id = my_firm_id());

-- Client: read-only access to cases linked to them
CREATE POLICY "case: client read own"
  ON "case" FOR SELECT
  USING (client_id = my_client_id());

-- ─────────────────────────────────────────
-- 5. DOCUMENT
-- ─────────────────────────────────────────
ALTER TABLE document ENABLE ROW LEVEL SECURITY;

-- Staff/admin: full access to documents within their firm
CREATE POLICY "document: staff full access"
  ON document FOR ALL
  USING (firm_id = my_firm_id())
  WITH CHECK (firm_id = my_firm_id());

-- Client: read-only access to documents where visible_to_client = true
-- AND the document belongs to one of their cases.
CREATE POLICY "document: client read visible"
  ON document FOR SELECT
  USING (
    visible_to_client = true
    AND case_id IN (
      SELECT id FROM "case" WHERE client_id = my_client_id()
    )
  );

-- ─────────────────────────────────────────
-- 6. CASE EVENT
-- ─────────────────────────────────────────
ALTER TABLE case_event ENABLE ROW LEVEL SECURITY;

-- Staff/admin: full access
CREATE POLICY "case_event: staff full access"
  ON case_event FOR ALL
  USING (firm_id = my_firm_id())
  WITH CHECK (firm_id = my_firm_id());

-- Client: read-only access to events where visible_to_client = true
-- AND the event belongs to one of their cases.
CREATE POLICY "case_event: client read visible"
  ON case_event FOR SELECT
  USING (
    visible_to_client = true
    AND case_id IN (
      SELECT id FROM "case" WHERE client_id = my_client_id()
    )
  );

-- ─────────────────────────────────────────
-- 7. NOTE (internal only — no client policy)
-- ─────────────────────────────────────────
ALTER TABLE note ENABLE ROW LEVEL SECURITY;

-- Staff/admin: full access to notes within their firm
CREATE POLICY "note: staff full access"
  ON note FOR ALL
  USING (firm_id = my_firm_id())
  WITH CHECK (firm_id = my_firm_id());

-- No client policy on note — clients cannot see this table at all.

-- ─────────────────────────────────────────
-- 8. AUDIT LOG (append-only via service role)
-- ─────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Staff/admin: read audit log for their firm
CREATE POLICY "audit_log: staff read own-firm"
  ON audit_log FOR SELECT
  USING (firm_id = my_firm_id());

-- INSERT is handled exclusively by triggers and server-side service role.
-- No client access.
