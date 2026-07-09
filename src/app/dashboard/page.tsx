import { redirect } from 'next/navigation'

/** /dashboard → redirect to the real cases page */
export default function DashboardPage() {
  redirect('/cases')
}
