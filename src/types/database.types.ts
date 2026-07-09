export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ──────────────────────────────────────────────────
// Role type — shared across the app
// ──────────────────────────────────────────────────
export type UserRole = 'firm_admin' | 'staff' | 'client'

export type CaseStatus = 'intake' | 'active' | 'awaiting_court' | 'closed'

// ──────────────────────────────────────────────────
// Row types (what Supabase returns from SELECT *)
// ──────────────────────────────────────────────────
export interface FirmRow {
  id: string
  name: string
  plan_tier: string
  created_at: string
}

export interface UserProfileRow {
  id: string
  firm_id: string
  full_name: string
  role: UserRole
  created_at: string
}

export interface ClientRow {
  id: string
  firm_id: string
  name: string
  email: string
  phone: string | null
  portal_access: boolean
  auth_user_id: string | null
  created_at: string
}

export interface CaseRow {
  id: string
  firm_id: string
  client_id: string
  title: string
  matter_type: string
  status: CaseStatus
  assigned_user_id: string | null
  created_at: string
  updated_at: string
}

export interface DocumentRow {
  id: string
  case_id: string
  firm_id: string
  filename: string
  storage_path: string
  tag: string | null
  visible_to_client: boolean
  uploaded_by: string | null
  created_at: string
}

export interface CaseEventRow {
  id: string
  case_id: string
  firm_id: string
  title: string
  event_date: string   // 'YYYY-MM-DD'
  visible_to_client: boolean
  created_at: string
}

export interface NoteRow {
  id: string
  case_id: string
  firm_id: string
  author_id: string | null
  body: string
  created_at: string
}

export interface AuditLogRow {
  id: string
  firm_id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string
  payload: Json | null
  created_at: string
}

// ──────────────────────────────────────────────────
// Insert types (what you pass to INSERT)
// ──────────────────────────────────────────────────
export type InsertFirm       = Omit<FirmRow, 'id' | 'created_at'>
export type InsertUserProfile = Omit<UserProfileRow, 'created_at'>
export type InsertClient     = Omit<ClientRow, 'id' | 'created_at'>
export type InsertCase       = Omit<CaseRow, 'id' | 'created_at' | 'updated_at'>
export type InsertDocument   = Omit<DocumentRow, 'id' | 'created_at'>
export type InsertCaseEvent  = Omit<CaseEventRow, 'id' | 'created_at'>
export type InsertNote       = Omit<NoteRow, 'id' | 'created_at'>

// ──────────────────────────────────────────────────
// Update types
// ──────────────────────────────────────────────────
export type UpdateCase      = Partial<Pick<CaseRow, 'title' | 'matter_type' | 'status' | 'assigned_user_id'>>
export type UpdateDocument  = Partial<Pick<DocumentRow, 'tag' | 'visible_to_client'>>
export type UpdateCaseEvent = Partial<Pick<CaseEventRow, 'title' | 'event_date' | 'visible_to_client'>>
