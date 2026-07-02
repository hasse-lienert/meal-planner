import { createHash } from 'crypto'

// Session token derived from APP_PASSWORD — can't be forged without knowing the password.
// Changing APP_PASSWORD invalidates all existing sessions.
export function sessionToken(): string {
  return createHash('sha256')
    .update(`mp_session:${process.env.APP_PASSWORD}`)
    .digest('hex')
}

export function isValidSession(value: string | undefined): boolean {
  return !!value && value === sessionToken()
}
