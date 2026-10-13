import type { RsoDetail, RsoDoc } from '../api/types'
import { allocateByTag, type AllocateResult, type StockRow } from './allocate'

export interface RsoLine extends RsoDetail {
  stockOutQty: number
}

export interface RsoState {
  requestStockOutId: string
  requestNo: string
  details: RsoLine[]
  stocks: StockRow[]
}

export function fromServer(doc: RsoDoc, requestNo: string): RsoState {
  return {
    requestStockOutId: doc.requestStockOutId,
    requestNo: doc.reqeustNo ?? doc.requestNo ?? requestNo,
    details: doc.hRequestStockOutDetailDTOs.map((d) => ({ ...d, stockOutQty: 0 })),
    stocks: doc.hStocks.map((s) => ({ ...s, acceptQty: 0 })),
  }
}

export function stockOut(state: RsoState, tagNo: string, qty: number): AllocateResult<RsoLine> & { state?: RsoState } {
  const r = allocateByTag(state.stocks, state.details, tagNo, qty, {
    cap: (d) => d.requestQty,
    done: (d) => d.stockOutQty,
    bump: (d, by) => ({ ...d, stockOutQty: d.stockOutQty + by }),
    duplicateMsg: 'Duplicate ITA TAG Card in Request Stock Out',
    notFoundMsg: 'Not Found ITA TAG Card in Request Stock Out',
    overDetailMsg: 'Over Quantity Request',
  })
  return r.ok ? { ...r, state: { ...state, stocks: r.stocks, details: r.details } } : r
}

/** What a scanned tag maps to, used to prefill the Stock Out form. */
export function lookupTag(state: RsoState, tagNo: string) {
  const stocks = state.stocks.filter((s) => s.tagNo === tagNo)
  if (stocks.length === 0) return null
  const keys = new Set(stocks.map((s) => `${s.iszjPo}|${s.itaPo}`))
  const details = state.details.filter((d) => keys.has(`${d.iszjPo}|${d.itaPo}`))
  if (details.length === 0) return null
  const stockRemain = stocks.reduce((n, s) => n + (s.qty - s.acceptQty), 0)
  const requestRemain = details.reduce((n, d) => n + (d.requestQty - d.stockOutQty), 0)
  return {
    itaPo: details[0].itaPo,
    requestQty: details.reduce((n, d) => n + d.requestQty, 0),
    stockOutQty: details.reduce((n, d) => n + d.stockOutQty, 0),
    suggestedQty: Math.max(0, Math.min(stockRemain, requestRemain)),
  }
}

export interface ViewRow {
  itaPo: string
  requestQty: number
  stockOutQty: number
}

/** Same rule as frm_StockOut_View: while anything is outstanding show only untouched lines and block confirm. */
export function summarize(state: RsoState) {
  const group = (rows: RsoLine[]): ViewRow[] => {
    const m = new Map<string, ViewRow>()
    for (const r of rows) {
      const cur = m.get(r.itaPo) ?? { itaPo: r.itaPo, requestQty: 0, stockOutQty: 0 }
      cur.requestQty += r.requestQty
      cur.stockOutQty += r.stockOutQty
      m.set(r.itaPo, cur)
    }
    return [...m.values()]
  }
  const remain =
    state.details.reduce((n, d) => n + d.requestQty, 0) - state.details.reduce((n, d) => n + d.stockOutQty, 0)
  if (remain > 0) return { canConfirm: false, rows: group(state.details.filter((d) => d.stockOutQty === 0)) }
  return { canConfirm: true, rows: group(state.details.filter((d) => d.stockOutQty !== 0)) }
}

export function toPayload(state: RsoState) {
  return {
    requestStockOutId: state.requestStockOutId,
    requestNo: state.requestNo,
    hRequestStockOutDetailDTOs: state.details,
    hStocks: state.stocks.filter((s) => s.acceptQty !== 0),
  }
}
