import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { ReceiptResult } from '../api/types'
import { Field, Grid, Screen, Sub } from '../components/Page'
import { ResultScreens, toGrid, type ResultData } from '../components/ResultScreens'
import { ScanInput } from '../components/ScanInput'
import { MAX, withinLength } from '../lib/tag'
import { useGuard } from '../state/guard'
import { usePersistentState } from '../state/persist'
import { useUi } from '../state/ui'

interface Slip { deliverySlipNo: string; invoiceFlag: boolean }
type Mode = 'Add' | 'Edit' | 'Delete'

export function Receipt() {
  const nav = useNavigate()
  const guard = useGuard()
  const { alert, confirm } = useUi()
  const [slips, setSlips, clear] = usePersistentState<Slip[]>('receipt', [])
  const [screen, setScreen] = useState<'scan' | 'view'>('scan')
  const [mode, setMode] = useState<Mode>('Add')
  const [scan, setScan] = useState('')
  const [invoice, setInvoice] = useState(false)
  const [armed, setArmed] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)

  const reset = (next: Mode = 'Add') => {
    setMode(next)
    setScan('')
    setInvoice(false)
    setArmed(false)
  }

  const find = (no: string) => slips.find((s) => s.deliverySlipNo === no)

  const onEnter = async (raw: string) => {
    if (!raw) return void (await alert('Please Scan Delivery Slip No'))
    if (!withinLength(raw, MAX.deliverySlip)) return void (await alert('Invalid Digit'))
    if (mode === 'Add') {
      if (find(raw)) return void (await alert('Duplicate Delivery Slip No'))
    } else {
      const s = find(raw)
      if (!s) return void (await alert('Not Found Delivery Slip No'))
      setInvoice(s.invoiceFlag)
    }
    setArmed(true)
  }

  const process = async () => {
    const no = scan.trim()
    if (!no) return void (await alert('Please Scan Delivery Slip No'))
    if (!withinLength(no, MAX.deliverySlip)) return void (await alert('Invalid Digit'))
    if (mode === 'Add') {
      if (find(no)) return void (await alert('Duplicate Delivery Slip No'))
      setSlips([...slips, { deliverySlipNo: no, invoiceFlag: invoice }])
    } else {
      if (!find(no)) return void (await alert('Not Found Delivery Slip No'))
      setSlips(mode === 'Edit' ? slips.map((s) => (s.deliverySlipNo === no ? { ...s, invoiceFlag: invoice } : s)) : slips.filter((s) => s.deliverySlipNo !== no))
    }
    reset()
  }

  const send = async () => {
    if (!(await confirm('Do you want to confirm ?'))) return
    const res = await guard.resend(() => api.put<ReceiptResult[]>('/handheld/receipt/deliveryslip', slips))
    if (res === undefined) return
    clear()
    reset()
    setScreen('scan')
    if (res === 'cancel') return
    setResult({
      ok: res.status === 'SUCCESS',
      grid: res.result
        ? toGrid(res.result, ['Delivery Slip No', 'Invoice Flag', 'Status', 'Reason'], (r) => [r.deliverySlipNo, r.invoiceFlag ? 'Yes' : 'No', r.status, r.reason ?? ''])
        : null,
    })
  }

  if (result) return <ResultScreens process="Receipt" data={result} onClose={() => nav('/')} />

  if (screen === 'view') {
    return (
      <Screen title="Receipt" bar={[{ label: 'Back', onClick: () => setScreen('scan') }, { label: 'Confirm', onClick: send, hidden: slips.length === 0 }]}>
        <Sub>Receipt</Sub>
        <Grid cols={['Delivery Slip No.', 'Invoice']} rows={slips.map((s) => [s.deliverySlipNo, s.invoiceFlag ? 'YES' : 'NO'])} />
      </Screen>
    )
  }

  return (
    <Screen
      title="Receipt"
      bar={[
        { label: 'Back', onClick: () => (mode === 'Add' ? (clear(), nav('/')) : reset()) },
        { label: 'Edit', onClick: () => reset('Edit'), hidden: slips.length === 0 },
        { label: 'Delete', onClick: () => reset('Delete'), hidden: slips.length === 0 },
        { label: 'Next', onClick: () => setScreen('view'), hidden: slips.length === 0 },
      ]}
    >
      <div className="info">
        {armed && (
          <>
            <div>Delivery Slip No : {scan.trim()}</div>
            <div>Invoice No : {invoice ? 'Yes' : 'No'}</div>
          </>
        )}
      </div>
      <Field label={mode === 'Add' ? 'Delivery Slip No :' : `Delivery Slip No : (${mode})`}>
        <ScanInput value={scan} onChange={setScan} onSubmit={onEnter} />
      </Field>
      <div className="row">
        <span>Invoice :</span>
        <label><input type="radio" checked={!invoice} onChange={() => { setInvoice(false); setArmed(true) }} /> No</label>
        <label><input type="radio" checked={invoice} onChange={() => { setInvoice(true); setArmed(true) }} /> Yes</label>
      </div>
      <button className="btn btn-gray block" onClick={process}>{mode}</button>
    </Screen>
  )
}
