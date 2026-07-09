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

async function verify() {
  console.log(`=== Verifying Case Details for ID: ${caseId} ===`)

  // 1. Fetch case
  const { data: caseRow, error: caseErr } = await admin
    .from('case')
    .select('id, title, status, matter_type, client_id')
    .eq('id', caseId)
    .single()

  if (caseErr) {
    console.error('Case fetch error:', caseErr.message)
    return
  }
  console.log(`Case: "${caseRow.title}" | Status: ${caseRow.status} | Type: ${caseRow.matter_type}`)

  // 2. Fetch client
  const { data: clientRow } = await admin
    .from('client')
    .select('name, email, portal_access, auth_user_id')
    .eq('id', caseRow.client_id)
    .single()
  
  if (clientRow) {
    console.log(`Client: ${clientRow.name} | Email: ${clientRow.email} | Portal Access: ${clientRow.portal_access} | User Linked: ${!!clientRow.auth_user_id}`)
  }

  // 3. Fetch events
  const { data: events } = await admin
    .from('case_event')
    .select('title, event_date, visible_to_client')
    .eq('case_id', caseId)
  
  console.log(`\nScheduled Dates (${events?.length ?? 0}):`)
  events?.forEach(e => {
    console.log(` - ${e.title} on ${e.event_date} | Shared: ${e.visible_to_client}`)
  })

  // 4. Fetch notes
  const { data: notes } = await admin
    .from('note')
    .select('body, created_at')
    .eq('case_id', caseId)
  
  console.log(`\nInternal Notes (${notes?.length ?? 0}):`)
  notes?.forEach(n => {
    console.log(` - "${n.body}" at ${n.created_at}`)
  })

  // 5. Fetch audit logs
  const { data: logs } = await admin
    .from('audit_log')
    .select('action, created_at')
    .eq('entity_id', caseId)
  
  console.log(`\nAudit Logs for Case (${logs?.length ?? 0}):`)
  logs?.forEach(l => {
    console.log(` - ${l.action} at ${l.created_at}`)
  })
}

verify()
