-- ============================================================
-- JusticeHub — 0003_assignment_audit_trigger.sql
-- Adds an audit log trigger for case assignment changes.
-- The Step 1 migration (0001) already triggers on status changes;
-- this trigger completes the audit trail for assignment changes.
-- Apply via Supabase SQL editor or `supabase db push`.
-- ============================================================

CREATE OR REPLACE FUNCTION log_case_assignment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.assigned_user_id IS DISTINCT FROM NEW.assigned_user_id THEN
    INSERT INTO audit_log (firm_id, actor_id, action, entity_type, entity_id, payload)
    VALUES (
      NEW.firm_id,
      auth.uid(),
      'case.assignment_changed',
      'case',
      NEW.id,
      jsonb_build_object(
        'from', OLD.assigned_user_id,
        'to',   NEW.assigned_user_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS case_assignment_audit ON "case";
CREATE TRIGGER case_assignment_audit
  AFTER UPDATE ON "case"
  FOR EACH ROW
  EXECUTE FUNCTION log_case_assignment_change();

-- Verify both triggers exist after applying:
-- SELECT tgname FROM pg_trigger WHERE tgrelid = '"case"'::regclass;
-- Expected: case_status_audit, case_assignment_audit
