import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { RsoDoc } from '../api/types'
import { Page, ResultPanel, Table } from '../components/Page'
import { ScanInput } from '../components/ScanInput'
import { fromServer, lookupTag, stockOut, summarize, toPayload, type RsoState } from '../logic/stockout'
import { MAX, parseTagNoOnly, withinLength } from '../lib/tag'
import { useGuard } from '../state/guard'
import { usePersistentState } from '../state/persist'
import { useUi } from '../state/ui'

interface ResLine { iszjPo: string; itaPo: string; iszjQty: number; requestQty: number; stockOutQty: number }

export function StockOut() {
  const nav = useNavigate()
  const guard = useGuard()
  const { notify, confirm } = useUi()
  const [doc, setDoc, clear] = usePersistentState<RsoState | null>('stock-out', null)
  const [reqNo, setReqNo] = useState('')
  const [tag, setTag] = useState('')
  const [tagNo, setTagNo] = useState('')
  const [qty, setQty] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message?: string; rows: ResLine[] } | null>(null)

  const load = async (raw: string) => {
    if (!raw) return
    if (!withinLength(raw, MAX.requestNo)) return notify('Invalid Digit', 'error')
    const res = await guard(() => api.get<RsoDoc>(`/handheld/rso?requestNo=${encodeURIComponent(raw)}`))
    if (!res) return
    if (res.status !== 'SUCCESS') return notify(`${res.status}: ${res.message ?? ''}`, 'error')
    if (!res.result?.hRequestStockOutDetailDTOs?.length || !res.result.hStocks?.length) return notify('Not Found Data From Server', 'error')
    setDoc(fromServer(res.result, raw))
    setReqNo('')
  }

  const pickTag = (raw: string) => {
    if (!doc || !raw) return
    if (!withinLength(raw, MAX.tag)) return notify('Invalid Digit', 'error')
    const no = parseTagNoOnly(raw)
    if (!no) return notify('Invalid TAG format', 'error')
    const info = lookupTag(doc, no)
    if (!info) { setTag(''); return notify(`Not Found ITA TAG Card in Request Stock Out\n${no}`, 'error') }
    setTagNo(no)
    setQty(String(info.suggestedQty))
  }

  const reset = () => { setTag(''); setTagNo(''); setQty('') }

  const add = () => {
    if (!doc || !tagNo) return
    const r = stockOut(doc, tagNo, Number(qty))
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
    const res = await guard(() => api.put<{ hRequestStockOutDetailDTOs?: ResLine[] } | null>('/handheld/rso', toPayload(doc)))
    if (!res) return
    if (!res.result?.hRequestStockOutDetailDTOs) return notify(`${res.status} : ${res.message ?? ''}`, 'error')
    setResult({ ok: res.status === 'SUCCESS', message: res.message, rows: res.result.hRequestStockOutDetailDTOs })
  }

  const exit = () => { clear(); nav('/') }

  if (result) {
    return (
      <ResultPanel
        title="Request Stock Out"
        ok={result.ok}
        message={result.message}
        cols={['PROMIS PO', 'ITA PO', 'Request', 'Stock Out']}
        rows={result.rows.map((r) => [r.iszjPo, r.itaPo, r.requestQty, r.stockOutQty])}
        onDone={() => { if (result.ok) exit(); else setResult(null) }}
      />
    )
  }

  if (!doc) {
    return (
      <Page title="Request Stock Out">
        <label className="field">Request No</label>
        <ScanInput value={reqNo} onChange={setReqNo} onSubmit={load} placeholder="Scan request no (RSO-…)" />
        <button className="btn btn-primary block" onClick={() => load(reqNo.trim())}>Search</button>
      </Page>
    )
  }

  const s = summarize(doc)
  const info = tagNo ? lookupTag(doc, tagNo) : null
  return (
    <Page title="Request Stock Out" onBack={exit}>
      <p>Request Stock Out : <b>{doc.requestNo}</b></p>
      <label className="field">ITA TAG No</label>
      <ScanInput value={tag} onChange={setTag} onSubmit={pickTag} placeholder="Scan ITA tag" disabled={!!tagNo} />
      {info && (
        <>
          <p>ITA PO : <b>{info.itaPo}</b> · Request Qty : <b>{info.requestQty}</b> · Stock Out : <b>{info.stockOutQty}</b></p>
          <label className="field">Stock Out Qty</label>
          <ScanInput value={qty} onChange={setQty} onSubmit={add} inputMode="numeric" />
          <div className="row">
            <button className="btn" onClick={reset}>Cancel</button>
            <button className="btn btn-primary" onClick={add}>Add</button>
          </div>
        </>
      )}
      <h2 className={s.canConfirm ? 'ok' : 'warn'}>{s.canConfirm ? `Stock Out (${s.rows.length})` : `Stock Out Remain (${s.rows.length})`}</h2>
      <Table cols={['ITA PO', 'Request', 'Stock Out']} rows={s.rows.map((r) => [r.itaPo, r.requestQty, r.stockOutQty])} />
      {s.canConfirm && <button className="btn btn-primary block" onClick={send}>Confirm</button>}
    </Page>
  )
}
