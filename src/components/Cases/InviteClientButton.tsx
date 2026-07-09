'use client'

import React, { useState, useTransition } from 'react'
import { inviteClient } from '@/app/auth/actions'
import { Button } from '@/components/ui/Button'

interface InviteClientButtonProps {
  clientId: string
  clientEmail: string
  clientName: string
  portalAccess: boolean
  hasAuthUser: boolean
}

export function InviteClientButton({
  clientId,
  clientEmail,
  clientName,
  portalAccess,
  hasAuthUser,
}: InviteClientButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleInvite = async () => {
    setStatus('idle')
    setErrorMsg('')

    startTransition(async () => {
      try {
        await inviteClient(clientId, clientEmail, clientName)
        setStatus('success')
      } catch (err: any) {
        console.error('[invite] Failed:', err.message)
        setStatus('error')
        setErrorMsg(err.message || 'Failed to send invite.')
      }
    })
  }

  // Active status
  if (portalAccess && hasAuthUser) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
          ● Portal Access: Active
        </span>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Client has accepted the invite and can log in.
        </p>
      </div>
    )
  }

  // Pending status
  if (portalAccess && !hasAuthUser) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 600 }}>
            ● Invite Pending
          </span>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            Invitation sent, waiting for client to set password.
          </p>
        </div>
        
        {status === 'success' ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
            Invite resent successfully!
          </span>
        ) : (
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleInvite}
              disabled={isPending}
              style={{ width: '100%' }}
            >
              {isPending ? 'Resending...' : 'Resend Portal Invite'}
            </Button>
            {status === 'error' && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.25rem' }}>
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // Inactive status
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          ○ Portal Access: Disabled
        </span>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
          Client has no login access to Case details.
        </p>
      </div>

      {status === 'success' ? (
        <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
          Invitation sent successfully!
        </span>
      ) : (
        <div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleInvite}
            disabled={isPending}
            style={{ width: '100%' }}
          >
            {isPending ? 'Sending Invite...' : 'Enable Portal Access'}
          </Button>
          {status === 'error' && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.25rem' }}>
              {errorMsg}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
