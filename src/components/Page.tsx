import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../state/session'

export function Page({ title, onBack, children }: { title: string; onBack?: () => void; children: ReactNode }) {
  const nav = useNavigate()
  const { session } = useSession()
  return (
    <div className="page">
      <header className="bar">
        <button className="btn btn-ghost" onClick={onBack ?? (() => nav('/'))}>‹ Back</button>
        <h1>{title}</h1>
        <span className="user">{session?.userName}</span>
      </header>
      <main>{children}</main>
    </div>
  )
}

export function Table({ cols, rows, empty = 'No data' }: { cols: string[]; rows: (string | number | undefined)[][]; empty?: string }) {
  if (rows.length === 0) return <p className="muted">{empty}</p>
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Server response screen (frm_*_Result + frm_Successful/Unsuccessful). */
export function ResultPanel({
  title, ok, message, cols, rows, onDone, doneLabel,
}: {
  title: string; ok: boolean; message?: string; cols: string[]; rows: (string | number | undefined)[][]
  onDone: () => void; doneLabel?: string
}) {
  return (
    <Page title={title} onBack={onDone}>
      <div className={`banner ${ok ? 'banner-ok' : 'banner-fail'}`}>
        {ok ? `${title} successful` : `${title} unsuccessful${message ? `: ${message}` : ''}`}
      </div>
      <Table cols={cols} rows={rows} />
      <button className="btn btn-primary block" onClick={onDone}>{doneLabel ?? (ok ? 'Done' : 'Back to review')}</button>
    </Page>
  )
}
