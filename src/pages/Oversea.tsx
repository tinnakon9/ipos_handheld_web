import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { ShippingDoc } from '../api/types'
import { Page, ResultPanel, Table } from '../components/Page'
import { ScanInput } from '../components/ScanInput'
import { fromServer, scanPromis, summarize, toPayload, type OverseaState } from '../logic/oversea'
import { MAX, parseTagNoOnly, withinLength } from '../lib/tag'
import { useGuard } from '../state/guard'
import { usePersistentState } from '../state/persist'
import { useUi } from '../state/ui'

interface ResLine { iszjPo: string; itaPo: string; partName: string; shipQty: number; accpetQty?: number; acceptQty?: number }

export function Oversea() {
  const nav = useNavigate()
  const guard = useGuard()
  const { notify, confirm } = useUi()
  const [doc, setDoc, clear] = usePersistentState<OverseaState | null>('oversea', null)
  const [note, setNote] = useState('')
  const [tag, setTag] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message?: string; rows: ResLine[] } | null>(null)

  const load = async (raw: string) => {
    if (!raw) return
    if (!withinLength(raw, MAX.deliveryNote)) return notify('Invalid Digit', 'error')
    const res = await guard(() => api.get<ShippingDoc>(`/handheld/shipping?deliveryNoteNo=${encodeURIComponent(raw)}`))
    if (!res) return
    if (res.status !== 'SUCCESS') return notify(`${res.status}: ${res.message ?? ''}`, 'error')
    if (!res.result?.hShippingInvoiceDetailDTOs?.length) return notify('Not Found Data From Server', 'error')
    setDoc(fromServer(res.result))
    setNote('')
  }

  const scan = (raw: string) => {
    if (!doc || !raw) return
    if (!withinLength(raw, MAX.promisTag)) return notify('Invalid Digit', 'error')
    const no = parseTagNoOnly(raw)
    if (!no) return notify('Invalid TAG format', 'error')
    const r = scanPromis(doc, no)
    if (!r.ok) { setTag(''); return notify(r.error, 'error') }
    setDoc(r.state)
    setTag('')
  }

  const send = async () => {
    if (!doc || !(await confirm('Do you want to confirm ?'))) return
    const res = await guard(() => api.put<{ hShippingInvoiceDetailDTOs?: ResLine[] } | null>('/handheld/shipping', toPayload(doc)))
    if (!res) return
    if (!res.result?.hShippingInvoiceDetailDTOs) return notify(`${res.status} : ${res.message ?? ''}`, 'error')
    setResult({ ok: res.status === 'SUCCESS', message: res.message, rows: res.result.hShippingInvoiceDetailDTOs })
  }

  const exit = () => { clear(); nav('/') }

  if (result) {
    return (
      <ResultPanel
        title="Shipping Oversea"
        ok={result.ok}
        message={result.message}
        cols={['PROMIS PO', 'ITA PO', 'Part', 'Ship', 'Accept']}
        rows={result.rows.map((r) => [r.iszjPo, r.itaPo, r.partName, r.shipQty, r.accpetQty ?? r.acceptQty])}
        onDone={() => { if (result.ok) exit(); else setResult(null) }}
      />
    )
  }

  if (!doc) {
    return (
      <Page title="Shipping Oversea">
        <label className="field">Delivery Note No</label>
        <ScanInput value={note} onChange={setNote} onSubmit={load} placeholder="Scan delivery note" />
        <button className="btn btn-primary block" onClick={() => load(note.trim())}>Search</button>
      </Page>
    )
  }

  const s = summarize(doc)
  return (
    <Page title="Shipping Oversea" onBack={exit}>
      <p>Delivery Note : <b>{doc.deliveryNoteNo}</b></p>
      <label className="field">PROMIS TAG No</label>
      <ScanInput value={tag} onChange={setTag} onSubmit={scan} placeholder="Scan PROMIS tag" />
      <h2 className={s.canConfirm ? 'ok' : 'warn'}>{s.canConfirm ? `Received (${s.rows.length})` : `Remaining (${s.rows.length})`}</h2>
      <Table cols={['PROMIS PO', 'ITA PO', 'Part', 'Ship', 'Accept']}
        rows={s.rows.map((r) => [r.iszjPo, r.itaPo, r.partName, r.shipQty, r.acceptQty])} />
      {s.canConfirm && <button className="btn btn-primary block" onClick={send}>Confirm</button>}
    </Page>
  )
}
