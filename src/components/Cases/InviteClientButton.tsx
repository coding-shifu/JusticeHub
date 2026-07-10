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
  firmSlug: string
}

export function InviteClientButton({
  clientId,
  clientEmail,
  clientName,
  portalAccess,
  hasAuthUser,
  firmSlug,
}: InviteClientButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/portal/${firmSlug}/login`
    : `https://justicehub.com/portal/${firmSlug}/login`

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

  // Compute render states
  let statusContent;

  if (portalAccess && hasAuthUser) {
    statusContent = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
          ● Portal Access: Active
        </span>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Client has accepted the invite and can log in.
        </p>
      </div>
    )
  } else if (portalAccess && !hasAuthUser) {
    statusContent = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 600 }}>
            ● Invite Pending
          </span>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
            Invitation sent. Client can log in using their verification code.
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
  } else {
    statusContent = (
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {statusContent}

      <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
          Portal Login Link:
        </p>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="text"
            readOnly
            value={portalUrl}
            style={{
              flex: 1,
              fontSize: '0.75rem',
              padding: '4px 8px',
              background: 'var(--color-background-subtle)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-muted)',
              outline: 'none',
              width: '100%',
            }}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCopy} 
            style={{ 
              fontSize: '0.7rem', 
              padding: '0 8px', 
              height: '24px',
              border: '0.5px solid var(--color-border)',
              flexShrink: 0
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>
    </div>
  )
}
