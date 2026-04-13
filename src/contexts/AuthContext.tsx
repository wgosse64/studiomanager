import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isAdmin: boolean
  isStaff: boolean
  isClient: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data as Profile | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    let mounted = true

    // Safety timeout — never stay on loading screen forever
    const timeout = setTimeout(() => {
      if (mounted) setState(prev => prev.loading ? { ...prev, loading: false } : prev)
    }, 5000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      let profile: Profile | null = null
      try {
        if (session?.user) {
          profile = await fetchProfile(session.user.id)
        }
      } catch {
        // Profile fetch failed — continue without it
      }
      setState({ user: session?.user ?? null, profile, session, loading: false })
    }).catch(() => {
      if (mounted) setState({ user: null, profile: null, session: null, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        // Only refetch profile on meaningful auth events
        if (event === 'TOKEN_REFRESHED') {
          setState(prev => ({ ...prev, session }))
          return
        }
        let profile: Profile | null = null
        try {
          if (session?.user) {
            profile = await fetchProfile(session.user.id)
          }
        } catch {
          // Continue without profile
        }
        setState({ user: session?.user ?? null, profile, session, loading: false })
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setState({ user: null, profile: null, session: null, loading: false })
  }

  const refreshProfile = async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id)
      setState(prev => ({ ...prev, profile }))
    }
  }

  const role = state.profile?.role
  const value: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    isAdmin: role === 'admin',
    isStaff: role === 'staff' || role === 'admin',
    isClient: role === 'client',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
