import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { ReceiptResult } from '../api/types'
import { Page, ResultPanel } from '../components/Page'
import { ScanInput } from '../components/ScanInput'
import { MAX, withinLength } from '../lib/tag'
import { useGuard } from '../state/guard'
import { usePersistentState } from '../state/persist'
import { useUi } from '../state/ui'

interface Slip { deliverySlipNo: string; invoiceFlag: boolean }

export function Receipt() {
  const nav = useNavigate()
  const guard = useGuard()
  const { notify, confirm } = useUi()
  const [slips, setSlips, clear] = usePersistentState<Slip[]>('receipt', [])
  const [scan, setScan] = useState('')
  const [invoice, setInvoice] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message?: string; rows: ReceiptResult[] } | null>(null)

  const add = (raw: string) => {
    if (!raw) return notify('Please Scan Delivery Slip No', 'error')
    if (!withinLength(raw, MAX.deliverySlip)) return notify('Invalid Digit', 'error')
    if (slips.some((s) => s.deliverySlipNo === raw)) return notify('Duplicate Delivery Slip No', 'error')
    setSlips([...slips, { deliverySlipNo: raw, invoiceFlag: invoice }])
    setScan('')
    setInvoice(false)
  }

  const send = async () => {
    if (!(await confirm('Do you want to confirm ?'))) return
    const res = await guard(() => api.put<ReceiptResult[]>('/handheld/receipt/deliveryslip', slips))
    if (!res) return
    setResult({ ok: res.status === 'SUCCESS', message: res.message, rows: res.result ?? [] })
  }

  if (result) {
    return (
      <ResultPanel
        title="Receipt"
        ok={result.ok}
        message={result.message}
        cols={['Delivery Slip No', 'Invoice', 'Status', 'Reason']}
        rows={result.rows.map((r) => [r.deliverySlipNo, r.invoiceFlag ? 'Yes' : 'No', r.status, r.reason])}
        onDone={() => {
          if (result.ok) { clear(); nav('/') } else setResult(null)
        }}
      />
    )
  }

  return (
    <Page title="Receipt" onBack={() => { clear(); nav('/') }}>
      <label className="field">Delivery Slip No</label>
      <ScanInput value={scan} onChange={setScan} onSubmit={add} placeholder="Scan delivery slip" />
      <div className="row">
        <label><input type="radio" checked={!invoice} onChange={() => setInvoice(false)} /> Invoice: No</label>
        <label><input type="radio" checked={invoice} onChange={() => setInvoice(true)} /> Invoice: Yes</label>
      </div>
      <button className="btn btn-primary block" onClick={() => add(scan.trim())}>Add</button>

      <h2>Scanned ({slips.length})</h2>
      {slips.length === 0 && <p className="muted">Nothing scanned yet</p>}
      {slips.map((s) => (
        <div className="row chip" key={s.deliverySlipNo}>
          <span>{s.deliverySlipNo}</span>
          <button className="btn" onClick={() => setSlips(slips.map((x) => x === s ? { ...x, invoiceFlag: !x.invoiceFlag } : x))}>
            Invoice: {s.invoiceFlag ? 'Yes' : 'No'}
          </button>
          <button className="btn btn-danger" onClick={() => setSlips(slips.filter((x) => x !== s))}>Delete</button>
        </div>
      ))}
      {slips.length > 0 && <button className="btn btn-primary block" onClick={send}>Confirm</button>}
    </Page>
  )
}
