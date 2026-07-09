'use client'

import React, { useTransition } from 'react'
import Link from 'next/link'
import { updateCaseForm } from '@/actions/cases'
import type { CaseStatus } from '@/types/database.types'

interface Staff {
  id: string
  full_name: string
}

interface EditCaseFormProps {
  caseId: string
  currentStatus: CaseStatus
  currentAssignedId: string | null
  staffList: Staff[]
}

export function EditCaseForm({
  caseId,
  currentStatus,
  currentAssignedId,
  staffList,
}: EditCaseFormProps) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await updateCaseForm(caseId, formData)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <div className="form-section">
        <h2 className="form-section-title">Update Case Status & Assignment</h2>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="status" className="form-label">
            Case Status
          </label>
          <select
            id="status"
            name="status"
            className="form-select"
            defaultValue={currentStatus}
            required
            disabled={isPending}
          >
            <option value="intake">Intake</option>
            <option value="active">Active</option>
            <option value="awaiting_court">Awaiting Court</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="assigned_user_id" className="form-label">
            Assigned Attorney
          </label>
          <select
            id="assigned_user_id"
            name="assigned_user_id"
            className="form-select"
            defaultValue={currentAssignedId ?? ''}
            disabled={isPending}
          >
            <option value="">Unassigned</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-actions">
        <Link href={`/cases/${caseId}`} className="btn btn--secondary btn--md">
          Cancel
        </Link>
        <button
          type="submit"
          className="btn btn--primary btn--md"
          disabled={isPending}
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
