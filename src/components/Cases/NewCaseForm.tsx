'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { createCase, createClient_action } from '@/actions/cases'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ClientOption {
  id: string
  name: string
}

interface StaffOption {
  id: string
  full_name: string
}

interface NewCaseFormProps {
  initialClients: ClientOption[]
  attorneys: StaffOption[]
}

const MATTER_TYPES = [
  'Property',
  'Family',
  'Criminal',
  'Commercial',
  'Employment',
  'Other',
]

export function NewCaseForm({ initialClients, attorneys }: NewCaseFormProps) {
  const [clients, setClients] = useState<ClientOption[]>(initialClients)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientError, setClientError] = useState('')
  const [isClientPending, startClientTransition] = useTransition()

  // Inline Client Creation form submission
  const handleCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setClientError('')
    const form = e.currentTarget
    const formData = new FormData(form)

    startClientTransition(async () => {
      const res = await createClient_action(formData)
      if ('error' in res) {
        setClientError(res.error)
      } else {
        const newClientName = formData.get('name') as string
        const newClient = { id: res.id, name: newClientName }
        setClients((prev) => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)))
        setSelectedClientId(res.id)
        setIsModalOpen(false)
        form.reset()
      }
    })
  }

  return (
    <>
      <form action={createCase} className="form-card">
        <div className="form-section">
          <h2 className="form-section-title">Case details</h2>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="title" className="form-label">
              Case Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              className="form-input"
              placeholder="e.g. Smith v. Jones Contract Dispute"
              required
            />
          </div>

          <div className="form-row" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="matter_type" className="form-label">
                Matter Type
              </label>
              <select
                id="matter_type"
                name="matter_type"
                className="form-select"
                required
              >
                <option value="">Select a type</option>
                {MATTER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status" className="form-label">
                Initial Status
              </label>
              <select id="status" name="status" className="form-select" defaultValue="intake">
                <option value="intake">Intake</option>
                <option value="active">Active</option>
                <option value="awaiting_court">Awaiting Court</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2 className="form-section-title">Relations</h2>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label htmlFor="client_id" className="form-label" style={{ margin: 0 }}>
                Client
              </label>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ height: 'auto', padding: '0.125rem 0.375rem', fontSize: '0.75rem', color: 'var(--color-primary)' }}
                onClick={() => setIsModalOpen(true)}
              >
                + New Client
              </button>
            </div>
            <select
              id="client_id"
              name="client_id"
              className="form-select"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              required
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="assigned_user_id" className="form-label">
              Assigned Attorney
            </label>
            <select id="assigned_user_id" name="assigned_user_id" className="form-select">
              <option value="">Unassigned</option>
              {attorneys.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <Link href="/cases" className="btn btn--secondary btn--md">
            Cancel
          </Link>
          <Button type="submit" variant="primary" size="md">
            Create Case
          </Button>
        </div>
      </form>

      {/* Inline Create Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setClientError('')
        }}
        title="Add New Client"
      >
        {clientError && <div className="form-error">{clientError}</div>}
        <form onSubmit={handleCreateClient} className="modal-form">
          <div className="form-group">
            <label htmlFor="modal-client-name" className="form-label">
              Full Name
            </label>
            <input
              id="modal-client-name"
              name="name"
              type="text"
              className="form-input"
              placeholder="e.g. Jane Doe"
              required
              disabled={isClientPending}
            />
          </div>

          <div className="form-group">
            <label htmlFor="modal-client-email" className="form-label">
              Email Address
            </label>
            <input
              id="modal-client-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="e.g. jane.doe@example.com"
              required
              disabled={isClientPending}
            />
          </div>

          <div className="form-group">
            <label htmlFor="modal-client-phone" className="form-label">
              Phone Number (Optional)
            </label>
            <input
              id="modal-client-phone"
              name="phone"
              type="tel"
              className="form-input"
              placeholder="e.g. +1 (555) 019-2834"
              disabled={isClientPending}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setIsModalOpen(false)
                setClientError('')
              }}
              disabled={isClientPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary btn--sm"
              disabled={isClientPending}
            >
              {isClientPending ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
