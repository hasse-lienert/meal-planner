import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidSession } from '@/lib/auth'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = cookieStore.get('mp_session')

  if (!isValidSession(session?.value)) {
    redirect('/login')
  }

  return <>{children}</>
}
