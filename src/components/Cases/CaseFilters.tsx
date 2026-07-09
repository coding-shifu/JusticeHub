'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { CaseStatus } from '@/types/database.types'

interface Attorney { id: string; full_name: string }
interface ClientOption { id: string; name: string }

interface CaseFiltersProps {
  attorneys: Attorney[]
  clients:   ClientOption[]
  total:     number
}

const STATUS_OPTIONS: { value: CaseStatus | ''; label: string }[] = [
  { value: '',               label: 'All Statuses' },
  { value: 'intake',         label: 'Intake' },
  { value: 'active',         label: 'Active' },
  { value: 'awaiting_court', label: 'Awaiting Court' },
  { value: 'closed',         label: 'Closed' },
]

export function CaseFilters({ attorneys, clients, total }: CaseFiltersProps) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset to page 1 when filters change
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const currentStatus   = searchParams.get('status')   ?? ''
  const currentAttorney = searchParams.get('attorney') ?? ''
  const currentClient   = searchParams.get('client')   ?? ''

  const activeCount = [currentStatus, currentAttorney, currentClient].filter(Boolean).length

  return (
    <div className="filters-bar" role="search" aria-label="Filter cases">
      <span className="filters-bar-label">Filter:</span>

      <select
        id="filter-status"
        className="filter-select"
        value={currentStatus}
        onChange={e => updateFilter('status', e.target.value)}
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        id="filter-attorney"
        className="filter-select"
        value={currentAttorney}
        onChange={e => updateFilter('attorney', e.target.value)}
        aria-label="Filter by assigned attorney"
      >
        <option value="">All Attorneys</option>
        {attorneys.map(a => (
          <option key={a.id} value={a.id}>{a.full_name}</option>
        ))}
      </select>

      <select
        id="filter-client"
        className="filter-select"
        value={currentClient}
        onChange={e => updateFilter('client', e.target.value)}
        aria-label="Filter by client"
      >
        <option value="">All Clients</option>
        {clients.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <span className="filters-active-count" aria-live="polite">
        {total} {total === 1 ? 'case' : 'cases'}
        {activeCount > 0 && ` · ${activeCount} filter${activeCount > 1 ? 's' : ''} active`}
      </span>
    </div>
  )
}
