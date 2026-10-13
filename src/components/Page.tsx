import type { ReactNode } from 'react'

export interface BarItem {
  label: string
  onClick: () => void
  hidden?: boolean
}

/** One handheld screen: blue title panel, light body, dim-gray bottom bar of text buttons. */
export function Screen({ title, user, bar, children }: { title: string; user?: string; bar: BarItem[]; children: ReactNode }) {
  return (
    <div className="frame">
      <header className="panel-top">
        <h1>{title}</h1>
        {user && <span className="user">{user}</span>}
      </header>
      <main className="body">{children}</main>
      <footer className="panel-bottom">
        {bar.filter((b) => !b.hidden).map((b) => (
          <button key={b.label} className="link" onClick={b.onClick}>{b.label}</button>
        ))}
      </footer>
    </div>
  )
}

export type Cell = string | number | undefined

/** Read-only data grid (DataGrid). Rows whose index is in `red` are highlighted like FAIL rows. */
export function Grid({ cols, rows, red = [] }: { cols: string[]; rows: Cell[][]; red?: number[] }) {
  return (
    <div className="grid-wrap">
      <table className="grid">
        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={red.includes(i) ? 'red' : ''}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const Sub = ({ children }: { children: ReactNode }) => <div className="sub">{children}</div>

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}
