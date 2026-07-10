import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { ClientLoginForm } from '@/components/Portal/ClientLoginForm'

export default async function ClientFirmLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Fetch the firm details by slug using the admin client
  const adminSupabase = await createAdminClient()
  const { data: firm, error: firmError } = await adminSupabase
    .from('firm')
    .select('name')
    .eq('slug', slug)
    .maybeSingle()

  // If the firm doesn't exist, redirect to the generic client login error page
  if (firmError || !firm) {
    redirect('/auth/client-login?error=invalid_firm')
  }

  return (
    <div className="auth-page">
      <ClientLoginForm firmName={firm.name} slug={slug} />
    </div>
  )
}
