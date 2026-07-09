'use client'

import React, { useEffect, useState } from 'react'

interface AuditLogEntry {
  id: string
  action: string
  payload: any
  created_at: string
  actor: { full_name: string } | null
}

interface ActivityLogProps {
  logs: AuditLogEntry[]
  staffList: { id: string; full_name: string }[]
}

// Client-side relative time to avoid hydration mismatch
function getRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7) return `${diffDay}d ago`

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_LABELS: Record<string, string> = {
  intake: 'Intake',
  active: 'Active',
  awaiting_court: 'Awaiting Court',
  closed: 'Closed',
}

export function ActivityLog({ logs, staffList }: ActivityLogProps) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const getStaffName = (id: string | null) => {
    if (!id) return 'Unassigned'
    const staff = staffList.find((s) => s.id === id)
    return staff ? staff.full_name : 'Unknown User'
  }

  const formatDescription = (entry: AuditLogEntry) => {
    const actorName = entry.actor?.full_name ?? 'System'

    switch (entry.action) {
      case 'case.created':
        return (
          <>
            <strong>{actorName}</strong> created the case.
          </>
        )
      case 'case.status_changed': {
        const fromVal = STATUS_LABELS[entry.payload?.from] ?? entry.payload?.from ?? 'Unknown'
        const toVal = STATUS_LABELS[entry.payload?.to] ?? entry.payload?.to ?? 'Unknown'
        return (
          <>
            <strong>{actorName}</strong> changed status from <strong>{fromVal}</strong> to <strong>{toVal}</strong>.
          </>
        )
      }
      case 'case.assignment_changed': {
        const fromName = getStaffName(entry.payload?.from)
        const toName = getStaffName(entry.payload?.to)
        return (
          <>
            <strong>{actorName}</strong> reassigned the case from <strong>{fromName}</strong> to <strong>{toName}</strong>.
          </>
        )
      }
      case 'client.created':
        return (
          <>
            <strong>{actorName}</strong> created client <strong>{entry.payload?.name}</strong>.
          </>
        )
      case 'note.created':
        return (
          <>
            <strong>{actorName}</strong> added an internal note:
            <div style={{ marginTop: '0.35rem', padding: '0.625rem 0.875rem', background: 'var(--color-bg)', borderLeft: '3px solid var(--color-success)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', fontStyle: 'italic', fontSize: '0.85rem' }}>
              &ldquo;{entry.payload?.body}&rdquo;
            </div>
          </>
        )
      case 'event.created': {
        const isShared = entry.payload?.visible_to_client
        const eventDateStr = new Date(entry.payload?.event_date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        return (
          <>
            <strong>{actorName}</strong> scheduled key date: <strong>{entry.payload?.title}</strong> for <strong>{eventDateStr}</strong>.
            <span className={`badge ${isShared ? 'badge--active' : 'badge--closed'}`} style={{ marginLeft: '0.5rem', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
              {isShared ? 'Shared with Client' : 'Internal Only'}
            </span>
          </>
        )
      }
      case 'document.uploaded':
        return (
          <>
            <strong>{actorName}</strong> uploaded document: <strong>{entry.payload?.filename}</strong> ({entry.payload?.tag}).
          </>
        )
      case 'document.deleted':
        return (
          <>
            <strong>{actorName}</strong> deleted document: <strong>{entry.payload?.filename}</strong>.
          </>
        )
      case 'document.visibility_toggled': {
        const isShared = entry.payload?.visible_to_client
        return (
          <>
            <strong>{actorName}</strong> {isShared ? 'shared' : 'unshared'} document <strong>{entry.payload?.filename}</strong> {isShared ? 'with' : 'from'} client.
          </>
        )
      }
      default:
        return (
          <>
            <strong>{actorName}</strong> performed <strong>{entry.action}</strong>.
          </>
        )
    }
  }

  const getDotClass = (action: string) => {
    if (action === 'case.created') return 'activity-dot--created'
    if (action === 'case.status_changed') return 'activity-dot--status'
    if (action === 'case.assignment_changed') return 'activity-dot--assign'
    if (action === 'note.created') return 'activity-dot--created'
    if (action === 'event.created') return 'activity-dot--assign'
    if (action === 'document.uploaded') return 'activity-dot--status'
    if (action === 'document.deleted') return 'activity-dot--default'
    if (action === 'document.visibility_toggled') return 'activity-dot--status'
    return 'activity-dot--default'
  }

  if (logs.length === 0) {
    return (
      <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No activity logged yet.
      </div>
    )
  }

  return (
    <div className="activity-log" aria-label="Activity timeline">
      {logs.map((entry) => (
        <div key={entry.id} className="activity-entry">
          <div className="activity-dot-wrap">
            <div className={`activity-dot ${getDotClass(entry.action)}`} />
          </div>
          <div className="activity-body">
            <p className="activity-desc">{formatDescription(entry)}</p>
            <div className="activity-meta">
              <span>{hydrated ? getRelativeTime(entry.created_at) : ''}</span>
              <span className="breadcrumb-sep" style={{ margin: 0 }}>·</span>
              <span>
                {new Date(entry.created_at).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
