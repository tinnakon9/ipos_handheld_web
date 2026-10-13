import { describe, expect, it } from 'vitest'
import { parseTag, parseTagNoOnly } from '../lib/tag'
import { fromServer as rsoFrom, stockOut, summarize as rsoSummary, toPayload as rsoPayload, lookupTag } from './stockout'
import { fromServer as rfsFrom, receive } from './rfs'
import { fromServer as osFrom, scanPromis, summarize as osSummary } from './oversea'

describe('tag parsing', () => {
  it('parses TAG+F / TAG+P', () => {
    expect(parseTag('P2500000092+f')).toEqual({ tagNo: 'P2500000092', type: 'F' })
    expect(parseTag('P2500000092+P')).toEqual({ tagNo: 'P2500000092', type: 'P' })
  })
  it('rejects tags without exactly one +', () => {
    expect(parseTag('P2500000092')).toBeNull()
    expect(parseTag('a+b+c')).toBeNull()
    expect(parseTagNoOnly('+F')).toBeNull()
  })
})

const rso = () =>
  rsoFrom(
    {
      requestStockOutId: 'r1',
      reqeustNo: 'RSO-1',
      hRequestStockOutDetailDTOs: [{ requestStockDetailId: 'd1', iszjPo: 'Z1', itaPo: 'T1', iszjQty: 10, requestQty: 5 }],
      hStocks: [
        { stockInfoId: 's1', tagNo: 'TAG', iszjPo: 'Z1', itaPo: 'T1', qty: 3 },
        { stockInfoId: 's2', tagNo: 'TAG', iszjPo: 'Z1', itaPo: 'T1', qty: 4 },
      ],
    },
    'RSO-1',
  )

describe('request stock out', () => {
  it('spreads qty across stock rows and bumps the detail', () => {
    const r = stockOut(rso(), 'TAG', 5)
    expect(r.ok).toBe(true)
    const s = r.state!
    expect(s.stocks.map((x) => x.acceptQty)).toEqual([3, 2])
    expect(s.details[0].stockOutQty).toBe(5)
    expect(rsoSummary(s).canConfirm).toBe(true)
    expect(rsoPayload(s).hStocks).toHaveLength(2)
  })
  it('rejects over request / over stock / unknown tag / duplicate', () => {
    expect(stockOut(rso(), 'TAG', 6)).toMatchObject({ ok: false, error: 'Over Quantity Request' })
    expect(stockOut(rso(), 'TAG', 8)).toMatchObject({ ok: false, error: 'Over Quantity Stock' })
    expect(stockOut(rso(), 'NOPE', 1)).toMatchObject({ ok: false })
    expect(stockOut(rso(), 'TAG', 0)).toMatchObject({ ok: false, error: 'Invalid Quantity' })
  })
  it('blocks confirm until request fully picked, suggests min(stock, request)', () => {
    const s = rso()
    expect(rsoSummary(s).canConfirm).toBe(false)
    expect(lookupTag(s, 'TAG')?.suggestedQty).toBe(5)
    const partial = stockOut(s, 'TAG', 2).state!
    expect(rsoSummary(partial).canConfirm).toBe(false)
    expect(lookupTag(partial, 'TAG')?.suggestedQty).toBe(3)
  })
})

describe('rfs', () => {
  it('uses shipQty as the cap with its own error', () => {
    const s = rfsFrom({
      shippingInvoiceId: 'i', shippingInvoiceNo: 'R1', deliveryNoteNo: 'Q1',
      hShippingInvoiceDetailDTOs: [{ iszjPo: 'Z', itaPo: 'T', partName: 'BOLT', shipQty: 2 }],
      hStocks: [{ stockInfoId: 's', tagNo: 'TG', iszjPo: 'Z', itaPo: 'T', qty: 9 }],
    })
    expect(receive(s, 'TG', 3)).toMatchObject({ ok: false, error: 'Over Quantity Order' })
    expect(receive(s, 'TG', 2).state!.details[0].acceptQty).toBe(2)
  })
})

describe('oversea', () => {
  const s = osFrom({
    shippingInvoiceId: 'i', shippingInvoiceNo: 'V1', deliveryNoteNo: 'Q1',
    hShippingInvoiceDetailDTOs: [{ iszjPo: 'A', itaPo: 'T', partName: 'P', shipQty: 4 }],
  })
  it('accepts shipQty on scan, then flags duplicates', () => {
    const r = scanPromis(s, 'A')
    expect(r.ok && r.state.details[0].acceptQty).toBe(4)
    expect(osSummary((r as { state: typeof s }).state).canConfirm).toBe(true)
    expect(scanPromis((r as { state: typeof s }).state, 'A')).toMatchObject({ ok: false })
    expect(scanPromis(s, 'B')).toMatchObject({ ok: false })
  })
})
