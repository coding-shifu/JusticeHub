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

async function seed() {
  console.log('Seeding staff user...')
  const email = 'staff@testfirm.com'
  const password = 'SecurePassword123!'
  const fullName = 'Jane Attorney'
  const firmName = 'Justice Partners'

  try {
    // 1. Create Firm
    const { data: firm, error: firmErr } = await admin
      .from('firm')
      .insert({ name: firmName })
      .select('id')
      .single()
    if (firmErr) throw firmErr

    console.log(`Created Firm: ${firmName} (${firm.id})`)

    // 2. Create User
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'firm_admin',
        full_name: fullName,
        firm_id: firm.id
      }
    })
    if (authErr) throw authErr

    console.log(`Created Auth User: ${email}`)

    // 3. Create User Profile
    const { error: profileErr } = await admin
      .from('user_profile')
      .insert({
        id: authUser.user.id,
        firm_id: firm.id,
        full_name: fullName,
        role: 'firm_admin'
      })
    if (profileErr) throw profileErr

    console.log('Seeding successfully completed!')
    console.log('Credentials:')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
  } catch (err: any) {
    if (err.message?.includes('already exists') || err.message?.includes('duplicate key')) {
      console.log('Staff user already seeded. Ready for login.')
    } else {
      console.error('Seeding failed:', err.message)
    }
  }
}

seed()
