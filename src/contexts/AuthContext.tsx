import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type AdminRole = 'admin' | 'operator' | null

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  adminRole: AdminRole
  isAdmin: boolean
  isOperatorOrAdmin: boolean
  loading: boolean
  signUp: (params: {
    email: string
    password: string
    fullName: string
    phone?: string
  }) => Promise<void>
  signIn: (params: { email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [adminRole, setAdminRole] = React.useState<AdminRole>(null)
  const [loading, setLoading] = React.useState(true)

  const loadProfileAndRole = React.useCallback(async (userId: string) => {
    const [{ data: profileData }, { data: adminData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('admin_users').select('role').eq('user_id', userId).maybeSingle(),
    ])
    setProfile(profileData ?? null)
    setAdminRole((adminData?.role as AdminRole) ?? null)
  }, [])

  React.useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      if (data.session?.user) {
        loadProfileAndRole(data.session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        loadProfileAndRole(newSession.user.id)
      } else {
        setProfile(null)
        setAdminRole(null)
      }
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [loadProfileAndRole])

  const signUp: AuthContextValue['signUp'] = async ({ email, password, fullName, phone }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    })
    if (error) throw error
  }

  const signIn: AuthContextValue['signIn'] = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  const refreshProfile = async () => {
    if (session?.user) await loadProfileAndRole(session.user.id)
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    adminRole,
    isAdmin: adminRole === 'admin',
    isOperatorOrAdmin: adminRole === 'admin' || adminRole === 'operator',
    loading,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
