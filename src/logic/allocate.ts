/**
 * Quantity allocation shared by RFS (shipping) and Request Stock Out.
 * Ported from RFSDA.UpdateData / StockOutDA.UpdateData of the handheld app:
 * a scanned tag may span several stock rows; the entered qty is spread over the
 * rows that still have room, and the matching detail rows are bumped by the same amount.
 */
export interface StockRow {
  stockInfoId: string
  tagNo: string
  iszjPo: string
  itaPo: string
  qty: number
  acceptQty: number
}

export interface DetailKey {
  iszjPo: string
  itaPo: string
}

export interface AllocateOptions<D extends DetailKey> {
  /** Max the details may reach (shipQty / requestQty). */
  cap: (d: D) => number
  /** Quantity already counted on the detail (acceptQty / stockOutQty). */
  done: (d: D) => number
  bump: (d: D, by: number) => D
  duplicateMsg: string
  notFoundMsg: string
  overDetailMsg: string
}

export type AllocateResult<D> =
  | { ok: true; stocks: StockRow[]; details: D[] }
  | { ok: false; error: string }

const byPo = (a: StockRow, b: StockRow) => a.itaPo.localeCompare(b.itaPo) || a.iszjPo.localeCompare(b.iszjPo)

export function allocateByTag<D extends DetailKey>(
  stocks: StockRow[],
  details: D[],
  tagNo: string,
  qty: number,
  o: AllocateOptions<D>,
): AllocateResult<D> {
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, error: 'Invalid Quantity' }

  const forTag = stocks.filter((s) => s.tagNo === tagNo).sort(byPo)
  if (forTag.length === 0) return { ok: false, error: `${o.notFoundMsg}\n${tagNo}` }

  const open = forTag.filter((s) => s.acceptQty !== s.qty)
  if (open.length === 0) return { ok: false, error: `${o.duplicateMsg}\n${tagNo}` }

  const totalQty = open.reduce((n, s) => n + s.qty, 0)
  const acceptedQty = open.reduce((n, s) => n + s.acceptQty, 0) + qty
  if (acceptedQty > totalQty) return { ok: false, error: 'Over Quantity Stock' }

  const key = (x: DetailKey) => `${x.iszjPo}|${x.itaPo}`
  const tagKeys = new Set(forTag.map(key))
  const matched = details.filter((d) => tagKeys.has(key(d)))
  if (matched.length === 0) return { ok: false, error: 'Not Found ITA TAG Card In Detail' }
  const capQty = matched.reduce((n, d) => n + o.cap(d), 0)
  const doneQty = matched.reduce((n, d) => n + o.done(d), 0) + qty
  if (doneQty > capQty) return { ok: false, error: o.overDetailMsg }

  const used = new Map<string, number>()
  let remaining = qty
  const nextStocks = stocks.map((s) => {
    if (s.tagNo !== tagNo || s.acceptQty === s.qty || remaining === 0) return s
    const use = Math.min(remaining, s.qty - s.acceptQty)
    remaining -= use
    used.set(key(s), (used.get(key(s)) ?? 0) + use)
    return { ...s, acceptQty: s.acceptQty + use }
  })
  const nextDetails = details.map((d) => {
    const by = used.get(key(d))
    return by ? o.bump(d, by) : d
  })
  return { ok: true, stocks: nextStocks, details: nextDetails }
}
