'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { CaseListTable } from '@/components/Cases/CaseListTable'

interface ClientSortHandlerProps {
  cases: any[]
  sortBy: string
  sortDir: 'asc' | 'desc'
}

export function ClientSortHandler({ cases, sortBy, sortDir }: ClientSortHandlerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const handleSort = (col: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sortBy === col) {
      params.set('sortDir', sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sortBy', col)
      params.set('sortDir', 'desc') // default descending on new column
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <CaseListTable
      cases={cases}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={handleSort}
    />
  )
}
