import { useState } from 'react'
import { api } from '../api/client'
import type { RsoDoc } from '../api/types'
import { Field, Grid, Screen } from '../components/Page'
import { ResultScreens, type ResultData } from '../components/ResultScreens'
import { ScanInput } from '../components/ScanInput'
import { fromServer, lookupTag, stockOut, summarize, toPayload, type RsoState } from '../logic/stockout'
import { MAX, parseTagNoOnly, withinLength } from '../lib/tag'
import { useGuard } from '../state/guard'
import { usePersistentState } from '../state/persist'
import { useUi } from '../state/ui'
import { DocScreenView, Remain, useExit, type DocScreen } from './DocFlow'

interface ResLine { iszjPo: string; itaPo: string; requestQty: number; stockOutQty: number }

export function StockOut() {
  const guard = useGuard()
  const { alert, confirm } = useUi()
  const [doc, setDoc, clear] = usePersistentState<RsoState | null>('stock-out', null)
  const [screen, setScreen] = useState<DocScreen>('doc')
  const [tag, setTag] = useState('')
  const [tagNo, setTagNo] = useState('')
  const [qty, setQty] = useState('')
  const [result, setResult] = useState<ResultData | null>(null)
  const exit = useExit(clear)

  const load = async (raw: string) => {
    if (!raw) { await alert('Please Scan Request Stock Out'); return false }
    if (!withinLength(raw, MAX.requestNo)) { await alert('Invalid Digit'); return false }
    setDoc(null)
    const res = await guard(() => api.get<RsoDoc>(`/handheld/rso?requestNo=${encodeURIComponent(raw)}`))
    if (!res) return false
    if (res.status !== 'SUCCESS') { await alert(`${res.status}:${res.message ?? ''}`, 'Error'); return false }
    if (!res.result?.hRequestStockOutDetailDTOs || !res.result.hStocks) { await alert('Not Found Data From Server', 'Error'); return false }
    setDoc(fromServer(res.result, raw))
    return true
  }

  const reset = () => { setTag(''); setTagNo(''); setQty('') }

  const scan = async (raw: string) => {
    if (!doc) return
    if (!raw) return
    if (!withinLength(raw, MAX.tag)) return
    const no = parseTagNoOnly(raw)
    if (!no) return void (await alert('Invalid Format'))
    const info = lookupTag(doc, no)
    if (!info) { setTag(''); return void (await alert(`Not Found ITA TAG Card in Request Stock Out\n${no}`)) }
    setTag(no)
    setTagNo(no)
    setQty(String(info.stockQty))
  }

  const add = async () => {
    if (!doc || !tagNo) return
    if (!qty.trim()) return void (await alert('Please Input Stock Out Qty'))
    const r = stockOut(doc, tagNo, Number(qty))
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
    const res = await guard.resend(() => api.put<{ hRequestStockOutDetailDTOs?: ResLine[] } | null>('/handheld/rso', toPayload(doc)))
    if (res === undefined) return
    if (res === 'cancel') { clear(); setScreen('doc'); return }
    if (!res.result?.hRequestStockOutDetailDTOs) return void (await alert(`${res.status} : ${res.message ?? ''}`, 'Error'))
    const subtitle = `Request Stock Out : ${doc.requestNo}`
    clear()
    setScreen('doc')
    reset()
    setResult({
      ok: res.status === 'SUCCESS',
      subtitle,
      grid: { cols: ['ITA PO', 'Request Qty', 'Stock Out Qty'], rows: res.result.hRequestStockOutDetailDTOs.map((r) => [r.itaPo, r.requestQty, r.stockOutQty]), red: [] },
    })
  }

  if (result) return <ResultScreens process="Request Stock Out" data={result} onClose={exit} />

  const note = doc ? `Request Stock Out : ${doc.requestNo}` : ''

  if (screen === 'view' && doc) {
    const s = summarize(doc)
    return (
      <Screen title="Request Stock Out" bar={[{ label: 'Back', onClick: () => setScreen('doc') }, { label: 'Confirm', onClick: send, hidden: !s.canConfirm }]}>
        <div className="docline">{note}</div>
        <Remain ok={s.canConfirm}>{s.canConfirm ? `Stock Out (${s.rows.length})` : `Stock Out Remain (${s.rows.length})`}</Remain>
        <Grid cols={['ITA PO', 'Request Qty', 'Stock Out Qty']} rows={s.rows.map((r) => [r.itaPo, r.requestQty, r.stockOutQty])} />
      </Screen>
    )
  }

  if (screen === 'tag' && doc) {
    const info = tagNo ? lookupTag(doc, tagNo) : null
    return (
      <Screen title="Request Stock Out" bar={[{ label: 'Back', onClick: () => { reset(); setScreen('doc') } }, { label: 'Next', onClick: () => setScreen('view') }]}>
        <div className="docline">{note}</div>
        <div className="info">
          {info && (
            <>
              <div>ITA PO : {info.itaPo}</div>
              <div>Request Qty : {info.requestQty}</div>
              <div>Stock Out Qty : {info.stockOutQty}</div>
            </>
          )}
        </div>
        <Field label="ITA TAG No :">
          <ScanInput value={tag} onChange={setTag} onSubmit={scan} disabled={!!tagNo} />
        </Field>
        {info && (
          <>
            <Field label="Stock Qty :">
              <input value={info.requestQty} disabled readOnly />
            </Field>
            <Field label="Stock Out Qty :">
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
      title="Request Stock Out"
      label="Request Stock Out :"
      loaded={!!doc}
      docLabel={note}
      onLoad={load}
      onBack={exit}
      onNext={() => setScreen('tag')}
      onView={() => setScreen('view')}
    />
  )
}
