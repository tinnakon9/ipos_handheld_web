import { useState } from 'react'
import { api } from '../api/client'
import type { ShippingDoc } from '../api/types'
import { Field, Grid, Screen } from '../components/Page'
import { ResultScreens, type ResultData } from '../components/ResultScreens'
import { ScanInput } from '../components/ScanInput'
import { fromServer, lookupTag, receive, summarize, toPayload, type RfsState } from '../logic/rfs'
import { MAX, parseTagNoOnly, withinLength } from '../lib/tag'
import { useGuard } from '../state/guard'
import { usePersistentState } from '../state/persist'
import { useUi } from '../state/ui'
import { DocScreenView, Remain, useExit, type DocScreen } from './DocFlow'

interface ResLine { iszjPo: string; itaPo: string; partName: string; shipQty: number; acceptQty: number }

export function Rfs() {
  const guard = useGuard()
  const { alert, confirm } = useUi()
  const [doc, setDoc, clear] = usePersistentState<RfsState | null>('rfs', null)
  const [screen, setScreen] = useState<DocScreen>('doc')
  const [tag, setTag] = useState('')
  const [tagNo, setTagNo] = useState('')
  const [qty, setQty] = useState('')
  const [result, setResult] = useState<ResultData | null>(null)
  const exit = useExit(clear)

  const load = async (raw: string) => {
    if (!raw) { await alert('Please Scan Delivery Note'); return false }
    if (!withinLength(raw, MAX.deliveryNote)) { await alert('Invalid Digit'); return false }
    const parts = raw.split('+')
    if (parts.length !== 2) { await alert('Invalid Format'); return false }
    if (parts[1].toUpperCase() !== 'R') { await alert('Invalid Shipping Type'); return false }
    setDoc(null)
    const res = await guard(() => api.get<ShippingDoc>(`/handheld/shipping/rfs?deliveryNoteNo=${encodeURIComponent(parts[0])}`))
    if (!res) return false
    if (res.status !== 'SUCCESS') { await alert(`${res.status}:${res.message ?? ''}`, 'Error'); return false }
    if (!res.result?.hShippingInvoiceDetailDTOs || !res.result.hStocks) { await alert('Not Found Data From Server', 'Error'); return false }
    setDoc(fromServer(res.result))
    return true
  }

  const reset = () => { setTag(''); setTagNo(''); setQty('') }

  const scan = async (raw: string) => {
    if (!doc) return
    if (!raw) return void (await alert('Please Scan ITA TAG No'))
    if (!withinLength(raw, MAX.tag)) return void (await alert('Invalid Digit'))
    const no = parseTagNoOnly(raw)
    if (!no) return void (await alert('Invalid Format'))
    const info = lookupTag(doc, no)
    if (!info) { setTag(''); return void (await alert(`Not Found ITA TAG Card in Delivery Note\n${no}`)) }
    setTag(no)
    setTagNo(no)
    setQty(String(info.stockQty))
  }

  const add = async () => {
    if (!doc || !tagNo) return
    if (!qty.trim()) return void (await alert('Please Input Shipping Qty'))
    const r = receive(doc, tagNo, Number(qty))
    if (!r.ok) {
      await alert(r.error, 'Error')
      if (!r.error.startsWith('Over Quantity') && r.error !== 'Invalid Quantity') reset()
      return
    }
    setDoc(r.state!)
    reset()
  }

  const send = async () => {
    if (!doc || !(await confirm('Do you want to confirm ?'))) return
    const res = await guard.resend(() => api.put<{ hShippingInvoiceDetailDTOs?: ResLine[] } | null>('/handheld/shipping/rfs', toPayload(doc)))
    if (res === undefined) return
    if (res === 'cancel') { clear(); setScreen('doc'); return }
    if (!res.result?.hShippingInvoiceDetailDTOs) return void (await alert(`${res.status} : ${res.message ?? ''}`, 'Error'))
    const subtitle = `Delivery Note : ${doc.deliveryNoteNo}`
    clear()
    setScreen('doc')
    reset()
    setResult({
      ok: res.status === 'SUCCESS',
      subtitle,
      grid: { cols: ['ITA PO', 'Part Name', 'Shipping Qty'], rows: res.result.hShippingInvoiceDetailDTOs.map((r) => [r.itaPo, r.partName, r.acceptQty]), red: [] },
    })
  }

  if (result) return <ResultScreens process="Shipping (RFS)" data={result} onClose={exit} />

  const note = doc ? `Delivery Note : ${doc.deliveryNoteNo}` : ''

  if (screen === 'view' && doc) {
    const s = summarize(doc)
    return (
      <Screen title="Shipping (RFS)" bar={[{ label: 'Back', onClick: () => setScreen('doc') }, { label: 'Confirm', onClick: send, hidden: !s.canConfirm }]}>
        <div className="docline">{note}</div>
        <Remain ok={s.canConfirm}>{s.canConfirm ? `Shipping (${s.rows.length})` : `Shipping Remain (${s.rows.length})`}</Remain>
        <Grid cols={['ITA PO', 'Part Name', 'Shipping Qty']} rows={s.rows.map((r) => [r.itaPo, r.partName, r.acceptQty])} />
      </Screen>
    )
  }

  if (screen === 'tag' && doc) {
    const info = tagNo ? lookupTag(doc, tagNo) : null
    const first = doc.details.find((d) => info && d.itaPo === info.itaPo)
    return (
      <Screen title="Shipping (RFS)" bar={[{ label: 'Back', onClick: () => { reset(); setScreen('doc') } }, { label: 'Next', onClick: () => setScreen('view') }]}>
        <div className="docline">{note}</div>
        <div className="info">
          {info && (
            <>
              <div>ITA PO : {info.itaPo}</div>
              <div>Part Name : {first?.partName}</div>
              <div>Order Qty : {info.shipQty}</div>
              <div>Shipping Qty : {info.acceptQty}</div>
            </>
          )}
        </div>
        <Field label="ITA TAG No :">
          <ScanInput value={tag} onChange={setTag} onSubmit={scan} disabled={!!tagNo} />
        </Field>
        {info && (
          <>
            <Field label="Qty :">
              <input value={info.shipQty} disabled readOnly />
            </Field>
            <Field label="Shipping Qty :">
              <ScanInput value={qty} onChange={setQty} onSubmit={add} inputMode="numeric" />
            </Field>
            <div className="row center">
              <button className="btn btn-gray" onClick={reset}>Cancel</button>
              <button className="btn btn-gray" onClick={add}>Add</button>
            </div>
          </>
        )}
      </Screen>
    )
  }

  return (
    <DocScreenView
      title="Shipping (RFS)"
      label="Delivery Note :"
      loaded={!!doc}
      docLabel={note}
      onLoad={load}
      onBack={exit}
      onNext={() => setScreen('tag')}
      onView={() => setScreen('view')}
    />
  )
}
