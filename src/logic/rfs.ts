import type { ShippingDoc } from '../api/types'
import { allocateByTag, type AllocateResult, type StockRow } from './allocate'

export interface RfsLine {
  iszjPo: string
  itaPo: string
  tagNo?: string
  partRcvFlag?: string
  partName: string
  shipQty: number
  acceptQty: number
}

export interface RfsState {
  shippingInvoiceId: string
  shippingInvoiceNo: string
  deliveryNoteNo: string
  details: RfsLine[]
  stocks: StockRow[]
}

export function fromServer(doc: ShippingDoc): RfsState {
  return {
    shippingInvoiceId: doc.shippingInvoiceId,
    shippingInvoiceNo: doc.shippingInvoiceNo,
    deliveryNoteNo: doc.deliveryNoteNo,
    details: doc.hShippingInvoiceDetailDTOs.map((d) => ({ ...d, acceptQty: 0 })),
    stocks: (doc.hStocks ?? []).map((s) => ({ ...s, acceptQty: 0 })),
  }
}

export function receive(state: RfsState, tagNo: string, qty: number): AllocateResult<RfsLine> & { state?: RfsState } {
  const r = allocateByTag(state.stocks, state.details, tagNo, qty, {
    cap: (d) => d.shipQty,
    done: (d) => d.acceptQty,
    bump: (d, by) => ({ ...d, acceptQty: d.acceptQty + by }),
    duplicateMsg: 'Duplicate ITA TAG Card in Delivery Note',
    notFoundMsg: 'Not Found ITA TAG Card in Delivery Note',
    overDetailMsg: 'Over Quantity Order',
  })
  return r.ok ? { ...r, state: { ...state, stocks: r.stocks, details: r.details } } : r
}

export function lookupTag(state: RfsState, tagNo: string) {
  const stocks = state.stocks.filter((s) => s.tagNo === tagNo)
  if (stocks.length === 0) return null
  const keys = new Set(stocks.map((s) => `${s.iszjPo}|${s.itaPo}`))
  const details = state.details.filter((d) => keys.has(`${d.iszjPo}|${d.itaPo}`))
  if (details.length === 0) return null
  const stockRemain = stocks.reduce((n, s) => n + (s.qty - s.acceptQty), 0)
  const orderRemain = details.reduce((n, d) => n + (d.shipQty - d.acceptQty), 0)
  return {
    itaPo: details[0].itaPo,
    shipQty: details.reduce((n, d) => n + d.shipQty, 0),
    acceptQty: details.reduce((n, d) => n + d.acceptQty, 0),
    suggestedQty: Math.max(0, Math.min(stockRemain, orderRemain)),
  }
}

export interface ViewRow {
  itaPo: string
  iszjPo: string
  partName: string
  shipQty: number
  acceptQty: number
}

export function summarize(state: RfsState) {
  const remain = state.details.reduce((n, d) => n + d.shipQty, 0) - state.details.reduce((n, d) => n + d.acceptQty, 0)
  const pick = (f: (d: RfsLine) => boolean): ViewRow[] =>
    state.details.filter(f).map(({ itaPo, iszjPo, partName, shipQty, acceptQty }) => ({ itaPo, iszjPo, partName, shipQty, acceptQty }))
  if (remain > 0) return { canConfirm: false, rows: pick((d) => d.acceptQty === 0) }
  return { canConfirm: true, rows: pick((d) => d.acceptQty !== 0) }
}

export function toPayload(state: RfsState) {
  return {
    shippingInvoiceId: state.shippingInvoiceId,
    shippingInvoiceNo: state.shippingInvoiceNo,
    deliveryNoteNo: state.deliveryNoteNo,
    hShippingInvoiceDetailDTOs: state.details,
    hStocks: state.stocks.filter((s) => s.acceptQty !== 0),
  }
}
