import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Kind = 'info' | 'error' | 'success'

interface UiCtx {
  notify: (message: string, kind?: Kind) => void
  confirm: (message: string) => Promise<boolean>
}

const Ctx = createContext<UiCtx | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null)
  const [ask, setAsk] = useState<string | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const notify = useCallback((message: string, kind: Kind = 'info') => {
    setToast({ message, kind })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), kind === 'error' ? 6000 : 3000)
  }, [])

  const confirm = useCallback((message: string) => {
    setAsk(message)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const answer = (v: boolean) => {
    setAsk(null)
    resolver.current?.(v)
    resolver.current = null
  }

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm])

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.kind}`} role="alert" onClick={() => setToast(null)}>
          {toast.message}
        </div>
      )}
      {ask && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <p style={{ whiteSpace: 'pre-line' }}>{ask}</p>
            <div className="row">
              <button className="btn" onClick={() => answer(false)}>No</button>
              <button className="btn btn-primary" autoFocus onClick={() => answer(true)}>Yes</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useUi() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUi outside UiProvider')
  return c
}
