import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/)
      if (match) {
        const key = match[1].trim()
        let val = match[2].trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1)
        }
        process.env[key] = val
      }
    }
  }
} catch (e) {
  console.warn('Failed to parse .env.local file manually:', e)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in env.local')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const caseId = '4e9b2a99-c5af-40a1-b643-12ac5b42c6e3'
const staffEmail = 'staff@testfirm.com'

async function simulate() {
  console.log(`=== Simulating Staff Actions for Case: ${caseId} ===`)

  try {
    // 1. Get staff profile id
    const { data: staffProfile } = await admin
      .from('user_profile')
      .select('id, firm_id')
      .eq('role', 'firm_admin')
      .single()

    if (!staffProfile) {
      throw new Error('Staff profile not found.')
    }
    const staffId = staffProfile.id
    const firmId = staffProfile.firm_id

    // 2. Fetch the case details to get client id
    const { data: caseRow } = await admin
      .from('case')
      .select('client_id')
      .eq('id', caseId)
      .single()
    if (!caseRow) throw new Error('Case not found.')
    const clientId = caseRow.client_id

    // 3. Add a CaseEvent (Pre-trial Hearing)
    console.log('Adding CaseEvent: "Pre-trial Hearing" scheduled for 2026-07-05...')
    const { data: event, error: eventErr } = await admin
      .from('case_event')
      .insert({
        case_id: caseId,
        firm_id: firmId,
        title: 'Pre-trial Hearing',
        event_date: '2026-07-05',
        visible_to_client: true
      })
      .select('id')
      .single()
    if (eventErr) throw eventErr

    // Log event creation in audit log
    await admin.from('audit_log').insert({
      firm_id: firmId,
      actor_id: staffId,
      action: 'event.created',
      entity_type: 'case_event',
      entity_id: event.id,
      payload: { title: 'Pre-trial Hearing', event_date: '2026-07-05', visible_to_client: true }
    })

    // 4. Add an internal Note
    console.log('Adding internal Note: "Internal E2E note - client has strong evidence."...')
    const { data: note, error: noteErr } = await admin
      .from('note')
      .insert({
        case_id: caseId,
        firm_id: firmId,
        author_id: staffId,
        body: 'Internal E2E note - client has strong evidence.'
      })
      .select('id')
      .single()
    if (noteErr) throw noteErr

    // Log note creation in audit log
    await admin.from('audit_log').insert({
      firm_id: firmId,
      actor_id: staffId,
      action: 'note.created',
      entity_type: 'note',
      entity_id: note.id,
      payload: { preview: 'Internal E2E note - client has strong evidence.' }
    })

    // 5. Enable portal access and simulate client invite
    console.log('Enabling Client Portal Access for client id:', clientId)
    const { error: clientErr } = await admin
      .from('client')
      .update({ portal_access: true })
      .eq('id', clientId)
    if (clientErr) throw clientErr

    console.log('Simulation completed successfully! All database changes applied.')
  } catch (err: any) {
    console.error('Simulation failed:', err.message)
  }
}

simulate()
