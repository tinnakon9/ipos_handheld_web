import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setAuth } from '../api/client'
import { clearAllDrafts } from './persist'

interface Session {
  token: string
  sessionId: string
  userName: string
}

interface SessionCtx {
  session: Session | null
  login: (s: Session) => void
  logout: () => void
}

const KEY = 'session'
const Ctx = createContext<SessionCtx | null>(null)

function load(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const s = load()
    setAuth(s)
    return s
  })

  useEffect(() => {
    setAuth(session)
  }, [session])

  const login = useCallback((s: Session) => {
    clearAllDrafts()
    sessionStorage.setItem(KEY, JSON.stringify(s))
    setAuth(s)
    setSession(s)
  }, [])

  const logout = useCallback(() => {
    clearAllDrafts()
    sessionStorage.removeItem(KEY)
    setAuth(null)
    setSession(null)
  }, [])

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSession outside SessionProvider')
  return c
}
