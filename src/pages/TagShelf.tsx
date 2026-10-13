import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Page, ResultPanel } from '../components/Page'
import { ScanInput } from '../components/ScanInput'
import { MAX, parseTag, typeLabel, withinLength, type TagType } from '../lib/tag'
import { useGuard } from '../state/guard'
import { usePersistentState } from '../state/persist'
import { useUi } from '../state/ui'

interface Item { tagNo: string; type: TagType; shelf?: string }
interface Row { tagNo: string; type: string; status: string; reason?: string; shelfNo?: string; toShelf?: string }

interface Props {
  title: string
  storageKey: string
  endpoint: string
  /** Field name the API expects for the destination shelf. */
  shelfField: 'shelfNo' | 'toShelf'
  shelfLabel: string
}

/** Stock In and Change Location are the same flow: scan tags (one type per batch), scan a shelf, confirm. */
export function TagShelf({ title, storageKey, endpoint, shelfField, shelfLabel }: Props) {
  const nav = useNavigate()
  const guard = useGuard()
  const { notify, confirm } = useUi()
  const [items, setItems, clear] = usePersistentState<Item[]>(storageKey, [])
  const [tag, setTag] = useState('')
  const [shelf, setShelf] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message?: string; rows: Row[] } | null>(null)

  const pending = items.filter((i) => !i.shelf)

  const addTag = (raw: string) => {
    if (!raw) return
    if (!withinLength(raw, MAX.tag)) return notify('Invalid Digit', 'error')
    const t = parseTag(raw)
    if (!t) return notify('Invalid TAG format (expected TAGNO+F or TAGNO+P)', 'error')
    if (pending.length > 0 && pending[0].type !== t.type) {
      return notify(`Tag type must match the current batch (${typeLabel(pending[0].type)})`, 'error')
    }
    if (items.some((i) => i.tagNo === t.tagNo)) return notify(`Duplicate TAG\n${t.tagNo}`, 'error')
    setItems([...items, { tagNo: t.tagNo, type: t.type }])
    setTag('')
  }

  const addShelf = (raw: string) => {
    if (!raw) return notify(`Please Scan ${shelfLabel}`, 'error')
    if (!withinLength(raw, MAX.shelf)) return notify('Invalid Digit', 'error')
    if (pending.length === 0) return notify('Scan a TAG first', 'error')
    setItems(items.map((i) => (i.shelf ? i : { ...i, shelf: raw })))
    setShelf('')
  }

  const send = async () => {
    if (pending.length > 0) return notify(`Some tags have no ${shelfLabel}`, 'error')
    if (!(await confirm('Do you want to confirm ?'))) return
    const body = items.map((i) => ({ tagNo: i.tagNo, type: i.type, [shelfField]: i.shelf }))
    const res = await guard(() => api.put<Row[]>(endpoint, body))
    if (!res) return
    setResult({ ok: res.status === 'SUCCESS', message: res.message, rows: res.result ?? [] })
  }

  if (result) {
    return (
      <ResultPanel
        title={title}
        ok={result.ok}
        message={result.message}
        cols={['Tag', 'Type', shelfLabel, 'Status', 'Reason']}
        rows={result.rows.map((r) => [r.tagNo, r.type, r.shelfNo ?? r.toShelf, r.status, r.reason])}
        onDone={() => { if (result.ok) { clear(); nav('/') } else setResult(null) }}
      />
    )
  }

  return (
    <Page title={title} onBack={() => { clear(); nav('/') }}>
      <label className="field">ITA TAG No</label>
      <ScanInput value={tag} onChange={setTag} onSubmit={addTag} placeholder="Scan TAG (e.g. P2500000092+F)" disabled={false} />
      <label className="field">{shelfLabel}</label>
      <ScanInput value={shelf} onChange={setShelf} onSubmit={addShelf} placeholder="Scan shelf" autoFocus={false} />
      <button className="btn block" onClick={() => addShelf(shelf.trim())}>Apply shelf to {pending.length} tag(s)</button>

      <h2>Scanned ({items.length})</h2>
      {items.length === 0 && <p className="muted">Nothing scanned yet</p>}
      {items.map((i) => (
        <div className="row chip" key={i.tagNo}>
          <span>{i.tagNo} · {typeLabel(i.type)} · {i.shelf ?? '—'}</span>
          <button className="btn btn-danger" onClick={() => setItems(items.filter((x) => x !== i))}>Delete</button>
        </div>
      ))}
      {items.length > 0 && <button className="btn btn-primary block" onClick={send}>Confirm</button>}
    </Page>
  )
}
