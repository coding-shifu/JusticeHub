'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.types'

/**
 * writeAuditLog
 *
 * Writes a row to audit_log using the service-role client (bypasses RLS).
 * Called for actions not covered by DB triggers, e.g. case.created.
 *
 * The DB triggers in migrations 0001 + 0003 handle:
 *   - case.status_changed
 *   - case.assignment_changed
 *
 * This function handles the rest: case.created, client.created, etc.
 */
export async function writeAuditLog({
  firmId,
  actorId,
  action,
  entityType,
  entityId,
  payload,
}: {
  firmId: string
  actorId: string | null
  action: string
  entityType: string
  entityId: string
  payload?: Json
}) {
  const admin = await createAdminClient()

  const { error } = await admin.from('audit_log').insert({
    firm_id:     firmId,
    actor_id:    actorId,
    action,
    entity_type: entityType,
    entity_id:   entityId,
    payload:     payload ?? null,
  })

  if (error) {
    // Audit failures must never silently crash the caller.
    // Log server-side; surface nothing to the client.
    console.error('[audit] Failed to write audit log:', error.message)
  }
}
