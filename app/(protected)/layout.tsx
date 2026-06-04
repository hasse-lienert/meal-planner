import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = cookieStore.get('mp_session')

  if (session?.value !== 'authenticated') {
    redirect('/login')
  }

  return <>{children}</>
}
