import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { ShippingDoc } from '../api/types'
import { Page, ResultPanel, Table } from '../components/Page'
import { ScanInput } from '../components/ScanInput'
import { fromServer, lookupTag, receive, summarize, toPayload, type RfsState } from '../logic/rfs'
import { MAX, parseTagNoOnly, withinLength } from '../lib/tag'
import { useGuard } from '../state/guard'
import { usePersistentState } from '../state/persist'
import { useUi } from '../state/ui'

interface ResLine { iszjPo: string; itaPo: string; partName: string; shipQty: number; acceptQty: number }

export function Rfs() {
  const nav = useNavigate()
  const guard = useGuard()
  const { notify, confirm } = useUi()
  const [doc, setDoc, clear] = usePersistentState<RfsState | null>('rfs', null)
  const [note, setNote] = useState('')
  const [tag, setTag] = useState('')
  const [tagNo, setTagNo] = useState('')
  const [qty, setQty] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message?: string; rows: ResLine[] } | null>(null)

  const load = async (raw: string) => {
    if (!raw) return
    if (!withinLength(raw, MAX.deliveryNote)) return notify('Invalid Digit', 'error')
    const res = await guard(() => api.get<ShippingDoc>(`/handheld/shipping/rfs?deliveryNoteNo=${encodeURIComponent(raw)}`))
    if (!res) return
    if (res.status !== 'SUCCESS') return notify(`${res.status}: ${res.message ?? ''}`, 'error')
    if (!res.result?.hShippingInvoiceDetailDTOs?.length || !res.result.hStocks?.length) return notify('Not Found Data From Server', 'error')
    setDoc(fromServer(res.result))
    setNote('')
  }

  const pickTag = (raw: string) => {
    if (!doc || !raw) return
    if (!withinLength(raw, MAX.tag)) return notify('Invalid Digit', 'error')
    const no = parseTagNoOnly(raw)
    if (!no) return notify('Invalid TAG format', 'error')
    const info = lookupTag(doc, no)
    if (!info) { setTag(''); return notify(`Not Found ITA TAG Card in Delivery Note\n${no}`, 'error') }
    setTagNo(no)
    setQty(String(info.suggestedQty))
  }

  const reset = () => { setTag(''); setTagNo(''); setQty('') }

  const add = () => {
    if (!doc || !tagNo) return
    const r = receive(doc, tagNo, Number(qty))
    if (!r.ok) {
      notify(r.error, 'error')
      if (r.error.startsWith('Over Quantity') || r.error === 'Invalid Quantity') return
      return reset()
    }
    setDoc(r.state!)
    reset()
  }

  const send = async () => {
    if (!doc || !(await confirm('Do you want to confirm ?'))) return
    const res = await guard(() => api.put<{ hShippingInvoiceDetailDTOs?: ResLine[] } | null>('/handheld/shipping/rfs', toPayload(doc)))
    if (!res) return
    if (!res.result?.hShippingInvoiceDetailDTOs) return notify(`${res.status} : ${res.message ?? ''}`, 'error')
    setResult({ ok: res.status === 'SUCCESS', message: res.message, rows: res.result.hShippingInvoiceDetailDTOs })
  }

  const exit = () => { clear(); nav('/') }

  if (result) {
    return (
      <ResultPanel
        title="Shipping RFS"
        ok={result.ok}
        message={result.message}
        cols={['PROMIS PO', 'ITA PO', 'Part', 'Ship', 'Accept']}
        rows={result.rows.map((r) => [r.iszjPo, r.itaPo, r.partName, r.shipQty, r.acceptQty])}
        onDone={() => { if (result.ok) exit(); else setResult(null) }}
      />
    )
  }

  if (!doc) {
    return (
      <Page title="Shipping RFS">
        <label className="field">Delivery Note No</label>
        <ScanInput value={note} onChange={setNote} onSubmit={load} placeholder="Scan delivery note" />
        <button className="btn btn-primary block" onClick={() => load(note.trim())}>Search</button>
      </Page>
    )
  }

  const s = summarize(doc)
  const info = tagNo ? lookupTag(doc, tagNo) : null
  return (
    <Page title="Shipping RFS" onBack={exit}>
      <p>Delivery Note : <b>{doc.deliveryNoteNo}</b></p>
      <label className="field">ITA TAG No</label>
      <ScanInput value={tag} onChange={setTag} onSubmit={pickTag} placeholder="Scan ITA tag" disabled={!!tagNo} />
      {info && (
        <>
          <p>ITA PO : <b>{info.itaPo}</b> · Ship Qty : <b>{info.shipQty}</b> · Accepted : <b>{info.acceptQty}</b></p>
          <label className="field">Receive Qty</label>
          <ScanInput value={qty} onChange={setQty} onSubmit={add} inputMode="numeric" />
          <div className="row">
            <button className="btn" onClick={reset}>Cancel</button>
            <button className="btn btn-primary" onClick={add}>Add</button>
          </div>
        </>
      )}
      <h2 className={s.canConfirm ? 'ok' : 'warn'}>{s.canConfirm ? `Received (${s.rows.length})` : `Remaining (${s.rows.length})`}</h2>
      <Table cols={['ITA PO', 'PROMIS PO', 'Part', 'Ship', 'Accept']}
        rows={s.rows.map((r) => [r.itaPo, r.iszjPo, r.partName, r.shipQty, r.acceptQty])} />
      {s.canConfirm && <button className="btn btn-primary block" onClick={send}>Confirm</button>}
    </Page>
  )
}
