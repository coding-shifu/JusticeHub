import type { CaseStatus } from '@/types/database.types'

const LABELS: Record<CaseStatus, string> = {
  intake:         'Intake',
  active:         'Active',
  awaiting_court: 'Awaiting Court',
  closed:         'Closed',
}

interface StatusBadgeProps {
  status: CaseStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge badge--${status}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
