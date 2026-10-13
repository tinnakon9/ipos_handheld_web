import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Field, Grid, Screen, Sub } from '../components/Page'
import { ResultScreens, toGrid, type ResultData } from '../components/ResultScreens'
import { ScanInput } from '../components/ScanInput'
import { MAX, parseTag, typeLabel, withinLength, type TagType } from '../lib/tag'
import { useGuard } from '../state/guard'
import { usePersistentState } from '../state/persist'
import { useUi } from '../state/ui'

interface Item { tagNo: string; type: TagType; shelf?: string }
interface ServerRow { tagNo: string; type: string; status: string; reason?: string; shelfNo?: string; toShelf?: string; currentShelf?: string }

interface Props {
  title: string
  storageKey: string
  endpoint: string
  /** Field name the API expects for the destination shelf. */
  shelfField: 'shelfNo' | 'toShelf'
  /** Stock In has a Delete mode and a "Scan Shelf" link; Change Location uses "Next". */
  stockIn: boolean
}

type Screen_ = 'tag' | 'shelf' | 'view'

/** Stock In and Change Location: scan tags (one type only), scan a shelf, review, confirm. */
export function TagShelf({ title, storageKey, endpoint, shelfField, stockIn }: Props) {
  const nav = useNavigate()
  const guard = useGuard()
  const { alert, confirm } = useUi()
  const [items, setItems, clear] = usePersistentState<Item[]>(storageKey, [])
  const [screen, setScreen] = useState<Screen_>('tag')
  const [mode, setMode] = useState<'Add' | 'Delete'>('Add')
  const [tag, setTag] = useState('')
  const [shelf, setShelf] = useState('')
  const [shown, setShown] = useState<{ tagNo: string; type: TagType } | null>(null)
  const [shelfShown, setShelfShown] = useState('')
  const [controlType, setControlType] = useState<TagType | null>(null)
  const [result, setResult] = useState<ResultData | null>(null)

  const effectiveControl = controlType ?? items[0]?.type ?? null

  const onTag = async (raw: string) => {
    if (!raw) return void (await alert('Please Scan ITA TAG No'))
    if (!withinLength(raw, MAX.tag)) return void (await alert('Invalid Digit'))
    const t = parseTag(raw)
    if (!t) {
      setShown(null)
      return void (await alert('Invalid Format'))
    }
    setShown(t)
    if (mode === 'Add') {
      if (!effectiveControl) setControlType(t.type)
      else if (effectiveControl !== t.type) {
        setShown(null)
        setTag('')
        return void (await alert("Can't Stock in Full and Partial to same shelf"))
      }
      if (items.some((i) => i.tagNo === t.tagNo)) {
        setShown(null)
        setTag('')
        return void (await alert('Duplicate ITA TAG No'))
      }
      setItems([...items, { tagNo: t.tagNo, type: t.type }])
    } else {
      if (!items.some((i) => i.tagNo === t.tagNo)) {
        setShown(null)
        setTag('')
        return void (await alert('Not Found ITA TAG No'))
      }
      setItems(items.filter((i) => i.tagNo !== t.tagNo))
    }
    setTag('')
  }

  const onShelf = async (raw: string) => {
    if (!raw) return void (await alert(stockIn ? 'Please Scan Shelf' : 'Please Scan Go To Shelf'))
    if (!withinLength(raw, MAX.shelf)) return void (await alert('Invalid Digit'))
    setItems(items.map((i) => (i.shelf ? i : { ...i, shelf: raw })))
    setShelfShown(raw)
    setShelf('')
  }

  const allShelved = items.length > 0 && items.every((i) => i.shelf)

  const send = async () => {
    if (!(await confirm('Do you want to confirm ?'))) return
    const body = items.map((i) => ({ tagNo: i.tagNo, type: i.type, [shelfField]: i.shelf }))
    const res = await guard.resend(() => api.put<ServerRow[]>(endpoint, body))
    if (res === undefined) return
    clear()
    setControlType(null)
    setShown(null)
    setShelfShown('')
    setMode('Add')
    setScreen('tag')
    if (res === 'cancel') return
    setResult({
      ok: res.status === 'SUCCESS',
      grid: res.result
        ? stockIn
          ? toGrid(res.result, ['ITA TAG No.', 'Type', 'Shelf', 'Status', 'Reason'], (r) => [r.tagNo, r.type, r.shelfNo, r.status, r.reason ?? ''])
          : toGrid(res.result, ['ITA TAG No.', 'Old Shelf', 'Current Shelf', 'Status', 'Reason'], (r) => [r.tagNo, r.currentShelf, r.toShelf, r.status, r.reason ?? ''])
        : null,
    })
  }

  if (result) return <ResultScreens process={title} data={result} onClose={() => nav('/')} />

  if (screen === 'view') {
    return (
      <Screen title={title} bar={[{ label: 'Back', onClick: () => setScreen('tag') }, { label: 'Confirm', onClick: send, hidden: !allShelved }]}>
        <Sub>{title}</Sub>
        <Grid
          cols={stockIn ? ['ITA TAG No.', 'Type', 'Shelf'] : ['ITA TAG No.', 'To Shelf']}
          rows={items.map((i) => (stockIn ? [i.tagNo, typeLabel(i.type), i.shelf ?? ''] : [i.tagNo, i.shelf ?? '']))}
        />
      </Screen>
    )
  }

  if (screen === 'shelf') {
    return (
      <Screen title={title} bar={[{ label: 'Back', onClick: () => setScreen('tag') }, { label: 'Next', onClick: () => setScreen('view'), hidden: items.length === 0 }]}>
        <div className="info">{shelfShown && <div>Shelf : {shelfShown}</div>}</div>
        <Field label="Shelf :">
          <ScanInput value={shelf} onChange={setShelf} onSubmit={onShelf} />
        </Field>
      </Screen>
    )
  }

  const back = () => {
    if (mode === 'Add') {
      clear()
      nav('/')
    } else {
      setMode('Add')
      setShown(null)
      setTag('')
    }
  }
  const hasRows = items.length > 0
  return (
    <Screen
      title={title}
      bar={[
        { label: 'Back', onClick: back },
        { label: 'Delete', onClick: () => { setMode('Delete'); setTag('') }, hidden: !stockIn || !hasRows },
        { label: 'View', onClick: () => setScreen('view'), hidden: !hasRows },
        { label: stockIn ? 'Scan Shelf' : 'Next', onClick: () => setScreen('shelf'), hidden: !hasRows },
      ]}
    >
      <div className="info">
        {shown && (
          <>
            <div>ITA TAG No : {shown.tagNo}</div>
            <div>Type : {typeLabel(shown.type)}</div>
          </>
        )}
      </div>
      <Field label={mode === 'Add' ? 'ITA TAG No :' : 'ITA TAG No : (Delete)'}>
        <ScanInput value={tag} onChange={setTag} onSubmit={onTag} />
      </Field>
    </Screen>
  )
}
