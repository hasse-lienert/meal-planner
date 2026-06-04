import { cookies } from 'next/headers'

const SESSION_COOKIE = 'mp_session'
const SESSION_VALUE = 'authenticated'

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value === SESSION_VALUE
}

export function getSessionCookieName() {
  return SESSION_COOKIE
}

export function getSessionCookieValue() {
  return SESSION_VALUE
}
