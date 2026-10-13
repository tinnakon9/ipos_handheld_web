import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

/** MessageBox equivalents: alert = OK box, confirm = Yes/No box (default button is "No", like the handheld). */
interface UiCtx {
  alert: (message: string, title?: string) => Promise<void>
  confirm: (message: string, title?: string) => Promise<boolean>
}

interface Box {
  message: string
  title: string
  yesNo: boolean
}

const Ctx = createContext<UiCtx | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [box, setBox] = useState<Box | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const open = useCallback(
    (b: Box) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false)
        resolver.current = resolve
        setBox(b)
      }),
    [],
  )

  const alert = useCallback(async (message: string, title = 'Warning') => {
    await open({ message, title, yesNo: false })
  }, [open])

  const confirm = useCallback(
    (message: string, title = 'Confirm (Y/N).') => open({ message, title, yesNo: true }),
    [open],
  )

  const close = (v: boolean) => {
    setBox(null)
    resolver.current?.(v)
    resolver.current = null
  }

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm])

  return (
    <Ctx.Provider value={value}>
      {children}
      {box && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-title">{box.title}</div>
            <p style={{ whiteSpace: 'pre-line' }}>{box.message}</p>
            <div className="row end">
              {box.yesNo ? (
                <>
                  <button className="btn" onClick={() => close(true)}>Yes</button>
                  <button className="btn" autoFocus onClick={() => close(false)}>No</button>
                </>
              ) : (
                <button className="btn" autoFocus onClick={() => close(true)}>OK</button>
              )}
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
