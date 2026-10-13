import { useState } from 'react'
import { api } from '../api/client'
import type { ShippingDoc } from '../api/types'
import { Field, Grid, Screen } from '../components/Page'
import { ResultScreens, type ResultData } from '../components/ResultScreens'
import { ScanInput } from '../components/ScanInput'
import { fromServer, scanPromis, summarize, toPayload, type OverseaState } from '../logic/oversea'
import { MAX, withinLength } from '../lib/tag'
import { useGuard } from '../state/guard'
import { usePersistentState } from '../state/persist'
import { useUi } from '../state/ui'
import { DocScreenView, Remain, useExit, type DocScreen } from './DocFlow'

interface ResLine { iszjPo: string; itaPo?: string; partName?: string; shipQty?: number; accpetQty?: number; acceptQty?: number }

export function Oversea() {
  const guard = useGuard()
  const { alert, confirm } = useUi()
  const [doc, setDoc, clear] = usePersistentState<OverseaState | null>('oversea', null)
  const [screen, setScreen] = useState<DocScreen>('doc')
  const [tag, setTag] = useState('')
  const [tagShown, setTagShown] = useState('')
  const [result, setResult] = useState<ResultData | null>(null)
  const exit = useExit(clear)

  const load = async (raw: string) => {
    if (!raw) { await alert('Please Scan Delivery Note'); return false }
    if (!withinLength(raw, MAX.deliveryNote)) { await alert('Invalid Digit'); return false }
    const parts = raw.split('+')
    if (parts.length !== 2) { await alert('Invalid Format'); return false }
    if (parts[1].toUpperCase() !== 'O') { await alert('Invalid Shipping Type'); return false }
    setDoc(null)
    const res = await guard(() => api.get<ShippingDoc>(`/handheld/shipping?deliveryNoteNo=${encodeURIComponent(parts[0])}`))
    if (!res) return false
    if (res.status !== 'SUCCESS') { await alert(`${res.status}:${res.message ?? ''}`, 'Error'); return false }
    if (!res.result?.hShippingInvoiceDetailDTOs) { await alert('Not Found Data From Server', 'Error'); return false }
    setDoc(fromServer(res.result))
    return true
  }

  const scan = async (raw: string) => {
    if (!doc) return
    if (!raw) return void (await alert('Please Scan PROMIS TAG No'))
    if (!withinLength(raw, MAX.promisTag)) return void (await alert('Invalid Digit'))
    const parts = raw.split('+')
    if (parts.length !== 2) return void (await alert('Invalid Format'))
    const r = scanPromis(doc, parts[0])
    if (!r.ok) return void (await alert(r.error, 'Error'))
    setDoc(r.state)
    setTagShown(parts[0])
    setTag('')
  }

  const send = async () => {
    if (!doc || !(await confirm('Do you want to confirm ?'))) return
    const res = await guard.resend(() => api.put<{ hShippingInvoiceDetailDTOs?: ResLine[] } | null>('/handheld/shipping', toPayload(doc)))
    if (res === undefined) return
    if (res === 'cancel') { clear(); setScreen('doc'); return }
    if (!res.result?.hShippingInvoiceDetailDTOs) return void (await alert(`${res.status} : ${res.message ?? ''}`, 'Error'))
    const subtitle = `Delivery Note : ${doc.deliveryNoteNo}`
    clear()
    setScreen('doc')
    setTagShown('')
    setResult({
      ok: res.status === 'SUCCESS',
      subtitle,
      grid: {
        cols: ['PROMIS TAG No.'],
        rows: res.result.hShippingInvoiceDetailDTOs.map((r) => [r.iszjPo]),
        red: [],
      },
    })
  }

  if (result) return <ResultScreens process="Shipping (Oversea)" data={result} onClose={exit} />

  const note = doc ? `Delivery Note : ${doc.deliveryNoteNo}` : ''

  if (screen === 'view' && doc) {
    const s = summarize(doc)
    return (
      <Screen title="Shipping (Oversea)" bar={[{ label: 'Back', onClick: () => setScreen('doc') }, { label: 'Confirm', onClick: send, hidden: !s.canConfirm }]}>
        <div className="docline">{note}</div>
        <Remain ok={s.canConfirm}>{s.canConfirm ? `PROMIS TAG (${s.rows.length})` : `PROMIS TAG Remain (${s.rows.length})`}</Remain>
        <Grid cols={['PROMIS TAG No.']} rows={s.rows.map((r) => [r.iszjPo])} />
      </Screen>
    )
  }

  if (screen === 'tag' && doc) {
    return (
      <Screen title="Shipping (Oversea)" bar={[{ label: 'Back', onClick: () => setScreen('doc') }, { label: 'Next', onClick: () => setScreen('view') }]}>
        <div className="info">
          <div>{note}</div>
          {tagShown && <div>PROMIS TAG No : {tagShown}</div>}
        </div>
        <Field label="PROMIS TAG No :">
          <ScanInput value={tag} onChange={setTag} onSubmit={scan} />
        </Field>
      </Screen>
    )
  }

  return (
    <DocScreenView
      title="Shipping (Oversea)"
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
