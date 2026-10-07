import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { supabase } from "@/lib/mangahub-db"

type AuthState = { session: any; user: any; role: string; loading: boolean; signOut: () => Promise<void> }
const AuthContext = createContext<AuthState | null>(null)

async function ensureProfile(user: any) {
  if (!user?.id) return
  await supabase.from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id", ignoreDuplicates: true })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }: { data: any }) => {
      if (!alive) return
      setSession(data.session)
      setLoading(false)
      if (data.session?.user) void ensureProfile(data.session.user)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, nextSession: any) => {
      setSession(nextSession)
      setLoading(false)
      if (nextSession?.user) setTimeout(() => { void ensureProfile(nextSession.user) }, 0)
    })
    return () => { alive = false; if (listener?.subscription) listener.subscription.unsubscribe() }
  }, [])
  const value = useMemo<AuthState>(() => ({
    session,
    user: session?.user ?? null,
    role: session?.user?.app_metadata?.role ?? "user",
    loading,
    signOut: async () => { await supabase.auth.signOut() },
  }), [session, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}