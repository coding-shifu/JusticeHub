import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Manually parse .env.local to avoid requiring 'dotenv' module dependency
try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const match = line.match(/^\s*([^#\s=]+)\s*=\s*(.*)$/)
      if (match) {
        const key = match[1].trim()
        let val = match[2].trim()
        // Strip quotes if present
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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('Missing Supabase credentials in env.local')
  process.exit(1)
}

// Admin client to seed/clean data (bypasses RLS)
const admin = createClient(supabaseUrl as string, serviceRoleKey as string, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// Standard client to simulate client-side sessions
function getClientInstance() {
  return createClient(supabaseUrl as string, anonKey as string, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

async function runTests() {
  console.log('=== Starting RLS Isolation Security Audit ===')

  let clientAUser: any = null
  let clientBUser: any = null
  let firmAId: string = ''
  let firmBId: string = ''
  let clientAId: string = ''
  let clientBId: string = ''
  let caseAId: string = ''
  let caseBId: string = ''
  let docASharedId: string = ''
  let docAPrivateId: string = ''
  let docBSharedId: string = ''
  let eventASharedId: string = ''
  let eventAPrivateId: string = ''

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. SEED TEST DATA
    // ─────────────────────────────────────────────────────────────
    console.log('Seeding test firms...')
    const { data: firmA, error: firmAErr } = await admin.from('firm').insert({ name: 'Firm A RLS Test' }).select('id').single()
    if (firmAErr) throw new Error('firmA insert error: ' + firmAErr.message)
    const { data: firmB, error: firmBErr } = await admin.from('firm').insert({ name: 'Firm B RLS Test' }).select('id').single()
    if (firmBErr) throw new Error('firmB insert error: ' + firmBErr.message)
    
    firmAId = firmA.id
    firmBId = firmB.id

    console.log('Creating auth users for clients...')
    const emailA = `client.a.${Date.now()}@testrls.com`
    const emailB = `client.b.${Date.now()}@testrls.com`
    const password = 'SecurePassword123!'

    const { data: authA, error: authAErr } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { role: 'client' }
    })
    if (authAErr) throw authAErr
    clientAUser = authA.user

    const { data: authB, error: authBErr } = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { role: 'client' }
    })
    if (authBErr) throw authBErr
    clientBUser = authB.user

    console.log('Inserting client profiles...')
    const { data: clientA, error: clientAErr } = await admin.from('client').insert({
      firm_id: firmAId,
      name: 'Client A RLS',
      email: emailA,
      auth_user_id: clientAUser.id,
      portal_access: true
    }).select('id').single()
    if (clientAErr) throw new Error('clientA insert error: ' + clientAErr.message)
    clientAId = clientA.id

    const { data: clientB, error: clientBErr } = await admin.from('client').insert({
      firm_id: firmBId,
      name: 'Client B RLS',
      email: emailB,
      auth_user_id: clientBUser.id,
      portal_access: true
    }).select('id').single()
    if (clientBErr) throw new Error('clientB insert error: ' + clientBErr.message)
    clientBId = clientB.id

    // Create user_profile entries so that the RLS helper my_client_id() functions resolve correctly
    const { error: profileErr } = await admin.from('user_profile').insert([
      { id: clientAUser.id, firm_id: firmAId, full_name: 'Client A RLS', role: 'client' },
      { id: clientBUser.id, firm_id: firmBId, full_name: 'Client B RLS', role: 'client' }
    ])
    if (profileErr) throw new Error('user_profile insert error: ' + profileErr.message)

    console.log('Seeding cases...')
    const { data: caseA, error: caseAErr } = await admin.from('case').insert({
      firm_id: firmAId,
      client_id: clientAId,
      title: 'Case A (Client A)',
      matter_type: 'Property',
      status: 'active'
    }).select('id').single()
    if (caseAErr) throw new Error('caseA insert error: ' + caseAErr.message)
    caseAId = caseA.id

    const { data: caseB, error: caseBErr } = await admin.from('case').insert({
      firm_id: firmBId,
      client_id: clientBId,
      title: 'Case B (Client B)',
      matter_type: 'Family',
      status: 'active'
    }).select('id').single()
    if (caseBErr) throw new Error('caseB insert error: ' + caseBErr.message)
    caseBId = caseB.id

    console.log('Seeding documents (shared and private)...')
    const { data: docAShared, error: docASharedErr } = await admin.from('document').insert({
      case_id: caseAId,
      firm_id: firmAId,
      filename: 'shared-doc-a.pdf',
      storage_path: 'firmA/caseA/shared.pdf',
      tag: 'Evidence',
      visible_to_client: true
    }).select('id').single()
    if (docASharedErr) throw new Error('docAShared insert error: ' + docASharedErr.message)
    docASharedId = docAShared.id

    const { data: docAPrivate, error: docAPrivateErr } = await admin.from('document').insert({
      case_id: caseAId,
      firm_id: firmAId,
      filename: 'private-doc-a.pdf',
      storage_path: 'firmA/caseA/private.pdf',
      tag: 'Other',
      visible_to_client: false
    }).select('id').single()
    if (docAPrivateErr) throw new Error('docAPrivate insert error: ' + docAPrivateErr.message)
    docAPrivateId = docAPrivate.id

    const { data: docBShared, error: docBSharedErr } = await admin.from('document').insert({
      case_id: caseBId,
      firm_id: firmBId,
      filename: 'shared-doc-b.pdf',
      storage_path: 'firmB/caseB/shared.pdf',
      tag: 'Evidence',
      visible_to_client: true
    }).select('id').single()
    if (docBSharedErr) throw new Error('docBShared insert error: ' + docBSharedErr.message)
    docBSharedId = docBShared.id

    console.log('Seeding case events (shared and private)...')
    const { data: eventAShared, error: eventASharedErr } = await admin.from('case_event').insert({
      case_id: caseAId,
      firm_id: firmAId,
      title: 'Hearing (Shared)',
      event_date: '2026-10-15',
      visible_to_client: true
    }).select('id').single()
    if (eventASharedErr) throw new Error('eventAShared insert error: ' + eventASharedErr.message)
    eventASharedId = eventAShared.id

    const { data: eventAPrivate, error: eventAPrivateErr } = await admin.from('case_event').insert({
      case_id: caseAId,
      firm_id: firmAId,
      title: 'Filing (Private)',
      event_date: '2026-10-10',
      visible_to_client: false
    }).select('id').single()
    if (eventAPrivateErr) throw new Error('eventAPrivate insert error: ' + eventAPrivateErr.message)
    eventAPrivateId = eventAPrivate.id

    console.log('Data seeding completed. Starting client login simulation...')

    // ─────────────────────────────────────────────────────────────
    // 2. AUTHENTICATE AS CLIENT A
    // ─────────────────────────────────────────────────────────────
    const client = getClientInstance()
    const { data: authSession, error: loginErr } = await client.auth.signInWithPassword({
      email: emailA,
      password
    })
    if (loginErr) throw loginErr

    console.log('Logged in successfully as Client A. Testing RLS bounds...')

    // ─────────────────────────────────────────────────────────────
    // 3. CASE ISOLATION TESTS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 1. Case RLS Isolation Tests ---')
    const { data: casesList, error: casesErr } = await client.from('case').select('id, title')
    if (casesErr) throw casesErr

    console.log(`Cases visible to Client A: ${casesList.length}`)
    casesList.forEach(c => console.log(` - ${c.title}`))

    if (casesList.length !== 1 || casesList[0].id !== caseAId) {
      throw new Error(`FAIL: Case list size expected 1 (Case A only). Got: ${casesList.length}`)
    }
    console.log('PASS: Client A can only see Case A in list.')

    // Direct check Case B
    const { data: caseBRow } = await client.from('case').select('id').eq('id', caseBId)
    if (caseBRow && caseBRow.length > 0) {
      throw new Error('FAIL: Client A can read Case B details directly.')
    }
    console.log('PASS: Client A cannot direct-query Case B.')

    // ─────────────────────────────────────────────────────────────
    // 4. DOCUMENT VISIBILITY & ISOLATION TESTS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Document RLS Isolation & Visibility Tests ---')
    const { data: docsList, error: docsErr } = await client.from('document').select('id, filename')
    if (docsErr) throw docsErr

    console.log(`Documents visible to Client A: ${docsList.length}`)
    docsList.forEach(d => console.log(` - ${d.filename}`))

    if (docsList.length !== 1 || docsList[0].id !== docASharedId) {
      throw new Error(`FAIL: Document list expected 1 (shared-doc-a.pdf only). Got: ${docsList.length}`)
    }
    console.log('PASS: Client A can only see the shared document for Case A.')

    // Direct check private document A
    const { data: docAPrivateRow } = await client.from('document').select('id').eq('id', docAPrivateId)
    if (docAPrivateRow && docAPrivateRow.length > 0) {
      throw new Error('FAIL: Client A can read unshared private document details directly.')
    }
    console.log('PASS: Client A cannot direct-query unshared document (visible_to_client = false).')

    // Direct check Case B document
    const { data: docBSharedRow } = await client.from('document').select('id').eq('id', docBSharedId)
    if (docBSharedRow && docBSharedRow.length > 0) {
      throw new Error('FAIL: Client A can read Client B\'s shared document directly.')
    }
    console.log('PASS: Client A cannot direct-query Client B\'s documents.')

    // ─────────────────────────────────────────────────────────────
    // 5. EVENT VISIBILITY & ISOLATION TESTS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Event RLS Isolation & Visibility Tests ---')
    const { data: eventsList, error: eventsErr } = await client.from('case_event').select('id, title')
    if (eventsErr) throw eventsErr

    console.log(`Events visible to Client A: ${eventsList.length}`)
    eventsList.forEach(e => console.log(` - ${e.title}`))

    if (eventsList.length !== 1 || eventsList[0].id !== eventASharedId) {
      throw new Error(`FAIL: Event list expected 1 (Hearing (Shared) only). Got: ${eventsList.length}`)
    }
    console.log('PASS: Client A can only see shared case events.')

    // Direct check private event A
    const { data: eventAPrivateRow } = await client.from('case_event').select('id').eq('id', eventAPrivateId)
    if (eventAPrivateRow && eventAPrivateRow.length > 0) {
      throw new Error('FAIL: Client A can read unshared case event details directly.')
    }
    console.log('PASS: Client A cannot direct-query unshared case events (visible_to_client = false).')

    console.log('\n==============================================')
    console.log('🎉 ALL RLS ISOLATION AUDIT TESTS PASSED!')
    console.log('==============================================')

  } catch (err) {
    console.error('\n❌ RLS ISOLATION AUDIT TEST FAILED:', err)
  } finally {
    // ─────────────────────────────────────────────────────────────
    // 6. TEARDOWN
    // ─────────────────────────────────────────────────────────────
    console.log('\nCleaning up seeded test data...')
    if (clientAUser) await admin.auth.admin.deleteUser(clientAUser.id)
    if (clientBUser) await admin.auth.admin.deleteUser(clientBUser.id)
    if (firmAId) await admin.from('firm').delete().eq('id', firmAId)
    if (firmBId) await admin.from('firm').delete().eq('id', firmBId)
    console.log('Teardown finished.')
  }
}

runTests()
