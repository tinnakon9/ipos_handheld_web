/** Max scan lengths taken from the original handheld app (Function.ChkDigit calls). */
export const MAX = {
  deliverySlip: 11,
  tag: 13,
  shelf: 8,
  promisTag: 12,
  requestNo: 12,
  deliveryNote: 15,
} as const

export const withinLength = (value: string, max: number) => value.length <= max

export type TagType = 'F' | 'P'

export interface ParsedTag {
  tagNo: string
  type: TagType
}

/** Tag barcodes look like `P2500000092+F` (F = Full, P = Partial). */
export function parseTag(raw: string): ParsedTag | null {
  const parts = raw.trim().split('+')
  if (parts.length !== 2 || !parts[0]) return null
  return { tagNo: parts[0], type: parts[1].toUpperCase() === 'F' ? 'F' : 'P' }
}

/** Oversea/RFS/StockOut scans use `TAGNO+x`; only the part before `+` identifies the tag. */
export function parseTagNoOnly(raw: string): string | null {
  const parts = raw.trim().split('+')
  return parts.length === 2 && parts[0] ? parts[0] : null
}

export const typeLabel = (t: TagType) => (t === 'F' ? 'Full' : 'Partial')
