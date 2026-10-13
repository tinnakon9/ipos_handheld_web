import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Screen, type BarItem } from '../components/Page'
import { ScanInput } from '../components/ScanInput'

export type DocScreen = 'doc' | 'tag' | 'view'

/** First screen of Oversea / RFS / Request Stock Out: scan the document number, then Next. */
export function DocScreenView({
  title, label, loaded, docLabel, onLoad, onBack, onNext, onView,
}: {
  title: string
  label: string
  loaded: boolean
  docLabel: string
  onLoad: (raw: string) => Promise<boolean>
  onBack: () => void
  onNext: () => void
  onView: () => void
}) {
  const [value, setValue] = useState('')
  const bar: BarItem[] = [
    { label: 'Back', onClick: onBack },
    { label: 'View', onClick: onView, hidden: !loaded },
    { label: 'Next', onClick: onNext, hidden: !loaded },
  ]
  return (
    <Screen title={title} bar={bar}>
      <div className="info">{loaded && <div>{docLabel}</div>}</div>
      <Field label={label}>
        <ScanInput value={value} onChange={setValue} onSubmit={async (v) => { if (await onLoad(v)) setValue('') }} />
      </Field>
    </Screen>
  )
}

export function useExit(clear: () => void) {
  const nav = useNavigate()
  return () => {
    clear()
    nav('/')
  }
}

export function Remain({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <div className={`remain ${ok ? 'green' : 'red-text'}`}>{children}</div>
}
