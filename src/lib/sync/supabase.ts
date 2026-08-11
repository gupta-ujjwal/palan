import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  if (!url || !anonKey) return null

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
  return client
}

export function isCloudSyncEnabled(): boolean {
  return getSupabase() !== null
}

export async function getCurrentUser(): Promise<User | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getUser()
  return data.user ?? null
}

export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { error: 'Cloud sync is not configured' }
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo:
        typeof window !== 'undefined' ? window.location.origin + import.meta.env.BASE_URL : undefined,
    },
  })
  return { error: error?.message ?? null }
}

export async function signOut(): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.auth.signOut()
}
