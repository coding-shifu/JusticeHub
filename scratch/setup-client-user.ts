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
  console.warn('Failed to parse .env.local manually:', e)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing credentials')
  process.exit(1)
}

const admin = createClient(supabaseUrl as string, serviceRoleKey as string, {
  auth: { persistSession: false, autoRefreshToken: false }
})

async function setupClientPortalUser() {
  console.log('=== Setting up Client Portal Test User ===')

  const clientEmail = 'testclient@gmail.com'
  const clientPassword = 'ClientPass123!'

  // 1. Check if client exists
  const { data: clientRecord, error: clientErr } = await admin
    .from('client')
    .select('id, name, email, portal_access, auth_user_id, firm_id')
    .eq('email', clientEmail)
    .maybeSingle()

  if (clientErr) {
    console.error('Error fetching client:', clientErr.message)
    return
  }

  if (!clientRecord) {
    console.error(`No client found with email: ${clientEmail}`)
    console.log('Creating new test client...')
    
    // Find firm
    const { data: firm } = await admin.from('firm').select('id').single()
    if (!firm) { console.error('No firm found'); return }

    // Create auth user for client
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: clientEmail,
      password: clientPassword,
      email_confirm: true,
    })
    if (authErr) { console.error('Auth user creation failed:', authErr.message); return }

    // Create client record
    const { data: newClient, error: newClientErr } = await admin
      .from('client')
      .insert({
        firm_id: firm.id,
        name: 'Gmail Client',
        email: clientEmail,
        portal_access: true,
        auth_user_id: authData.user.id,
      })
      .select('id')
      .single()
    if (newClientErr) { console.error('Client record creation failed:', newClientErr.message); return }

    // Create user profile
    await admin.from('user_profile').insert({
      id: authData.user.id,
      firm_id: firm.id,
      full_name: 'Gmail Client',
      role: 'client',
    })

    console.log(`Created client: ${clientEmail} / ${clientPassword}`)
    return
  }

  console.log(`Client found: ${clientRecord.name} (${clientRecord.email})`)
  console.log(`Portal Access: ${clientRecord.portal_access}`)
  console.log(`Auth User ID linked: ${!!clientRecord.auth_user_id}`)

  let authUserId = clientRecord.auth_user_id

  // 2. If no auth user linked yet, create one
  if (!authUserId) {
    console.log('No auth user linked. Creating...')
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: clientEmail,
      password: clientPassword,
      email_confirm: true,
    })
    if (authErr) { console.error('Auth user creation failed:', authErr.message); return }
    authUserId = authData.user.id

    // Link auth user to client record
    await admin.from('client').update({ auth_user_id: authUserId, portal_access: true }).eq('id', clientRecord.id)

    // Create user_profile for client
    const { error: profileErr } = await admin.from('user_profile').insert({
      id: authUserId,
      firm_id: clientRecord.firm_id,
      full_name: clientRecord.name,
      role: 'client',
    })
    if (profileErr && !profileErr.message.includes('duplicate key')) {
      console.error('Profile creation failed:', profileErr.message)
    }

    console.log(`Linked new auth user for ${clientEmail}`)
  } else {
    // 3. Update password so we can log in
    console.log('Updating auth user password...')
    const { error: pwErr } = await admin.auth.admin.updateUserById(authUserId, {
      password: clientPassword,
      email_confirm: true,
    })
    if (pwErr) { console.error('Password update failed:', pwErr.message); return }
    
    // Ensure user_profile exists with client role
    const { data: existingProfile } = await admin.from('user_profile').select('id').eq('id', authUserId).maybeSingle()
    if (!existingProfile) {
      await admin.from('user_profile').insert({
        id: authUserId,
        firm_id: clientRecord.firm_id,
        full_name: clientRecord.name,
        role: 'client',
      })
    } else {
      // Make sure role is 'client'
      await admin.from('user_profile').update({ role: 'client' }).eq('id', authUserId)
    }
  }

  // 4. Ensure portal_access = true
  await admin.from('client').update({ portal_access: true }).eq('id', clientRecord.id)

  // 5. List what we have 
  const { data: cases } = await admin
    .from('case')
    .select('id, title, status')
    .eq('client_id', clientRecord.id)

  const { data: docs } = await admin
    .from('document')
    .select('filename, visible_to_client')
    .eq('firm_id', clientRecord.firm_id)

  const { data: events } = await admin
    .from('case_event')
    .select('title, event_date, visible_to_client')
    .eq('firm_id', clientRecord.firm_id)
    .eq('visible_to_client', true)

  console.log('\n=== READY TO TEST ===')
  console.log(`Client portal login: http://localhost:3000/auth/client-login`)
  console.log(`Email: ${clientEmail}`)
  console.log(`Password: ${clientPassword}`)
  console.log(`\nCases (${cases?.length ?? 0}):`)
  cases?.forEach(c => console.log(`  - ${c.title} [${c.status}]`))
  console.log(`\nShared Documents:`)
  docs?.filter(d => d.visible_to_client).forEach(d => console.log(`  - ${d.filename}`))
  console.log(`Private Documents:`)
  docs?.filter(d => !d.visible_to_client).forEach(d => console.log(`  - ${d.filename} (client cannot see this)`))
  console.log(`\nShared Events (${events?.length ?? 0}):`)
  events?.forEach(e => console.log(`  - ${e.title} on ${e.event_date}`))
}

setupClientPortalUser()
