import type { Plant } from '../types/plant'
import { getSupabase } from './supabase'

interface PlantRow {
  id: string
  user_id: string
  data: Plant
  updated_at: string
}

export async function pushPlants(plants: Plant[], userId: string): Promise<{ error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { error: 'Cloud sync is not configured' }

  if (plants.length === 0) return { error: null }

  const now = new Date().toISOString()
  const rows: PlantRow[] = plants.map((p) => ({
    id: p.id,
    user_id: userId,
    data: p,
    updated_at: now,
  }))

  const { error } = await sb
    .from('plants')
    .upsert(rows, { onConflict: 'user_id,id' })

  return { error: error?.message ?? null }
}

export async function pullPlants(userId: string): Promise<{ plants: Plant[]; error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { plants: [], error: 'Cloud sync is not configured' }

  const { data, error } = await sb.from('plants').select('data').eq('user_id', userId)

  if (error) return { plants: [], error: error.message }
  return { plants: (data ?? []).map((r) => r.data as Plant), error: null }
}

export async function pushStreakSnapshot(
  userId: string,
  current: number,
  longest: number,
): Promise<{ error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { error: 'Cloud sync is not configured' }

  const { error } = await sb.from('profiles').upsert(
    {
      id: userId,
      current_streak: current,
      longest_streak: longest,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  return { error: error?.message ?? null }
}

export interface FriendStreak {
  friendId: string
  displayName: string
  currentStreak: number
  longestStreak: number
}

export async function getFriendStreaks(userId: string): Promise<FriendStreak[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data, error } = await sb
    .from('friendships')
    .select('friend_id, status, profiles!friendships_friend_id_fkey(display_name, current_streak, longest_streak)')
    .eq('user_id', userId)
    .eq('status', 'accepted')

  if (error || !data) return []

  return data
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        friendId: row.friend_id,
        displayName: profile?.display_name ?? 'Friend',
        currentStreak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
      }
    })
    .sort((a, b) => b.currentStreak - a.currentStreak)
}
