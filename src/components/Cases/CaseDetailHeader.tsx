import Link from 'next/link'
import { StatusBadge } from '@/components/Cases/StatusBadge'
import type { CaseStatus } from '@/types/database.types'

interface CaseDetailHeaderProps {
  caseId: string
  title: string
  status: CaseStatus
  matterType: string
  clientName: string
  assignedAttorney: string | null
  createdAt: string
  updatedAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CaseDetailHeader({
  caseId,
  title,
  status,
  matterType,
  clientName,
  assignedAttorney,
  createdAt,
  updatedAt,
}: CaseDetailHeaderProps) {
  return (
    <div className="case-detail-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="case-detail-title" style={{ margin: 0 }}>{title}</h1>
            <StatusBadge status={status} />
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Matter Type: <strong>{matterType}</strong>
          </p>
        </div>
        <Link href={`/cases/${caseId}/edit`} className="btn btn--secondary btn--sm" id="edit-case-btn">
          {/* Edit icon */}
          <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }} aria-hidden="true">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.829z" />
          </svg>
          Edit Case
        </Link>
      </div>

      <div className="case-detail-meta">
        <div className="case-meta-item">
          {/* User icon */}
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          <span>Client: <strong>{clientName}</strong></span>
        </div>

        <div className="case-meta-item">
          {/* Briefcase icon */}
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M6 6V5a3 3 0 016 0v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 112 0v1H8V5zm-2 9a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span>Attorney: <strong>{assignedAttorney ?? 'Unassigned'}</strong></span>
        </div>

        <div className="case-meta-item">
          {/* Calendar icon */}
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span>Created: {formatDate(createdAt)}</span>
        </div>

        <div className="case-meta-item">
          {/* Refresh icon */}
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.25.76 5.002 5.002 0 009.74 1.183H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.76-1.25z" clipRule="evenodd" />
          </svg>
          <span>Updated: {formatDate(updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}
