'use client'

import React, { useState } from 'react'
import { getSignedDownloadUrl } from '@/actions/documents'
import { StatusBadge } from '@/components/Cases/StatusBadge'
import type { CaseStatus } from '@/types/database.types'

interface PortalDocument {
  id: string
  filename: string
  tag: string | null
  created_at: string
}

interface PortalCase {
  id: string
  title: string
  status: CaseStatus
  matter_type: string
  updated_at: string
  next_event: { title: string; event_date: string } | null
  documents: PortalDocument[]
}

interface ClientCaseListProps {
  cases: PortalCase[]
}

export function ClientCaseList({ cases }: ClientCaseListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = async (docId: string) => {
    setDownloadingId(docId)
    try {
      const url = await getSignedDownloadUrl(docId)
      window.open(url, '_blank')
    } catch (err: any) {
      alert(err.message || 'Failed to download document.')
    } finally {
      setDownloadingId(null)
    }
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
      {cases.map((c) => (
        <div key={c.id} className="case-info-card" style={{ padding: '1.5rem' }}>
          {/* Case Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1rem', borderBottom: '0.5px solid var(--color-border)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h3 className="modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>{c.title}</h3>
                <StatusBadge status={c.status} />
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Matter Type: <strong>{c.matter_type}</strong>
              </p>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
              Last updated: {formatDate(c.updated_at)}
            </div>
          </div>

          {/* Upcoming Event Section */}
          {(() => {
            if (!c.next_event) {
              return (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.75rem', fontStyle: 'italic' }}>
                  No upcoming key dates scheduled.
                </p>
              )
            }

            const eventDate = new Date(c.next_event.event_date)
            const now = new Date()
            const diffMs = eventDate.getTime() - now.getTime()
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
            const isSoon = diffDays >= 0 && diffDays <= 7

            const style = isSoon
              ? {
                  background: 'var(--color-warning-light)',
                  border: '1.5px dashed var(--color-warning)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-warning)',
                  fontSize: '0.85rem',
                  marginTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }
              : {
                  background: 'var(--color-surface)',
                  border: '0.5px solid var(--color-border)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  marginTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }

            return (
              <div style={style}>
                <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', color: 'currentColor', flexShrink: 0 }} aria-hidden="true">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>
                  Next Key Date: <strong>{c.next_event.title}</strong> on <strong>{formatDate(c.next_event.event_date)}</strong>
                </span>
              </div>
            )
          })()}

          {/* Shared Documents Section */}
          <div style={{ marginTop: '1.5rem' }}>
            <h4 className="case-info-card-title" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              Shared Documents
            </h4>
            
            {c.documents.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                No documents shared by your attorney yet.
              </p>
            ) : (
              <div className="case-table-wrap" style={{ marginTop: '0.75rem', border: '0.5px solid var(--color-border)' }}>
                <table className="case-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface)' }}>
                      <th>Filename</th>
                      <th>Category</th>
                      <th>Shared Date</th>
                      <th className="case-table-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.documents.map((doc) => (
                      <tr key={doc.id}>
                        <td style={{ fontWeight: 600 }}>{doc.filename}</td>
                        <td>
                          <span className="badge badge--active">
                            {doc.tag || 'Other'}
                          </span>
                        </td>
                        <td className="case-date">{formatDate(doc.created_at)}</td>
                        <td className="case-table-action">
                          <button
                            className="btn btn--primary btn--sm"
                            disabled={downloadingId === doc.id}
                            onClick={() => handleDownload(doc.id)}
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            {downloadingId === doc.id ? 'Downloading...' : 'Download'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
