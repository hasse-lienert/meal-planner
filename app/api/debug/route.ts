import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) ?? 'MISSING',
    anon_key_prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) ?? 'MISSING',
    anon_key_length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0,
    extension_secret_set: !!process.env.EXTENSION_SECRET,
    app_password_set: !!process.env.APP_PASSWORD,
  })
}
