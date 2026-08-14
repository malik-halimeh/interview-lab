import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { clearLocalCandidateData, syncStudyData } from './db'
import { isSupabaseConfigured, supabase } from './supabase'

interface CandidateProfile {
  nickname: string
  realName: string | null
  publishRealName: boolean
  leaderboardVisible: boolean
  consentedAt: string | null
}

interface AuthContextValue {
  configured: boolean
  loading: boolean
  user: User | null
  session: Session | null
  profile: CandidateProfile
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const demoProfile: CandidateProfile = {
  nickname: 'QuietComet-2048',
  realName: null,
  publishRealName: false,
  leaderboardVisible: true,
  consentedAt: null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(Boolean(supabase))
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<CandidateProfile>(demoProfile)

  const refreshProfile = async () => {
    if (!supabase) return
    const currentUser = (await supabase.auth.getUser()).data.user
    if (!currentUser) return
    const { data } = await supabase
      .from('profiles')
      .select('nickname, real_name, publish_real_name, leaderboard_visible, consented_at')
      .eq('id', currentUser.id)
      .single()
    if (data) {
      setProfile({
        nickname: data.nickname,
        realName: data.real_name,
        publishRealName: data.publish_real_name,
        leaderboardVisible: data.leaderboard_visible,
        consentedAt: data.consented_at
      })
    }
  }

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session) void refreshProfile()
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      if (nextSession) void refreshProfile()
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) return
    const sync = () => void syncStudyData(session.user.id).catch(() => undefined)
    sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [session?.user.id])

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured,
    loading,
    user: session?.user ?? null,
    session,
    profile,
    signIn: async () => {
      if (!supabase) return
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/assess` }
      })
    },
    signOut: async () => {
      await clearLocalCandidateData()
      if (supabase) await supabase.auth.signOut()
      setSession(null)
      setProfile(demoProfile)
    },
    refreshProfile
  }), [loading, profile, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
