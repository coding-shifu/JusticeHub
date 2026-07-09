import { NextRequest, NextResponse } from 'next/server'
import { inviteClient } from '@/app/auth/actions'

/**
 * POST /api/invite-client
 *
 * Body: { clientId: string, clientEmail: string, clientName: string }
 *
 * Protected: requires an authenticated staff/admin session.
 * Uses service-role key internally (via inviteClient Server Action).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, clientEmail, clientName } = body

    if (!clientId || !clientEmail || !clientName) {
      return NextResponse.json(
        { error: 'clientId, clientEmail, and clientName are required' },
        { status: 400 }
      )
    }

    const result = await inviteClient(clientId, clientEmail, clientName)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const status  = message === 'Unauthorized' ? 401
                  : message.includes('Only firm staff') ? 403
                  : 500
    return NextResponse.json({ error: message }, { status })
  }
}
