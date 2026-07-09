import { UserProfileRow, UserRole } from '@/types/database.types'

/**
 * Checks if a user profile has the 'firm_admin' role.
 */
export function isAdmin(profile: UserProfileRow | null): boolean {
  return profile?.role === 'firm_admin'
}

/**
 * Checks if a user profile has 'firm_admin' or 'staff' role.
 */
export function isStaff(profile: UserProfileRow | null): boolean {
  return profile?.role === 'firm_admin' || profile?.role === 'staff'
}

/**
 * Checks if a user profile has the 'client' role.
 * Note: clients authenticate via auth.users but their role is tracked
 * via user_profile (role = 'client') created on invite acceptance.
 */
export function isClient(profile: UserProfileRow | null): boolean {
  return profile?.role === 'client'
}

/**
 * Returns a human-readable label for a role.
 */
export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    firm_admin: 'Firm Admin',
    staff: 'Staff',
    client: 'Client',
  }
  return labels[role] ?? role
}

/**
 * Returns the home route for a given role.
 * Used in middleware and post-login redirects.
 */
export function homeRouteForRole(role: UserRole): string {
  if (role === 'client') return '/portal'
  return '/dashboard'
}
