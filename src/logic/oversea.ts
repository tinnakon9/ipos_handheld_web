import type { ShippingDoc } from '../api/types'

export interface OverseaLine {
  iszjPo: string
  itaPo: string
  partName: string
  shipQty: number
  acceptQty: number
}

export interface OverseaState {
  shippingInvoiceId: string
  shippingInvoiceNo: string
  deliveryNoteNo: string
  details: OverseaLine[]
}

export function fromServer(doc: ShippingDoc): OverseaState {
  return {
    shippingInvoiceId: doc.shippingInvoiceId,
    shippingInvoiceNo: doc.shippingInvoiceNo,
    deliveryNoteNo: doc.deliveryNoteNo,
    details: doc.hShippingInvoiceDetailDTOs.map(({ iszjPo, itaPo, partName, shipQty }) => ({
      iszjPo, itaPo, partName, shipQty, acceptQty: 0,
    })),
  }
}

/** A PROMIS tag is the line's iszjPo; scanning it accepts the whole shipQty. */
export function scanPromis(state: OverseaState, tagNo: string): { ok: true; state: OverseaState } | { ok: false; error: string } {
  const rows = state.details.filter((d) => d.iszjPo === tagNo)
  if (rows.length === 0) return { ok: false, error: `Not Found PROMIS TAG Card in Delivery Note\n${tagNo}` }
  if (!rows.some((d) => d.acceptQty === 0)) return { ok: false, error: `Duplicate PROMIS TAG Card in Delivery Note\n${tagNo}` }
  return {
    ok: true,
    state: { ...state, details: state.details.map((d) => (d.iszjPo === tagNo && d.acceptQty === 0 ? { ...d, acceptQty: d.shipQty } : d)) },
  }
}

export function summarize(state: OverseaState) {
  const remain = state.details.reduce((n, d) => n + d.shipQty, 0) - state.details.reduce((n, d) => n + d.acceptQty, 0)
  if (remain > 0) return { canConfirm: false, rows: state.details.filter((d) => d.acceptQty === 0) }
  return { canConfirm: true, rows: state.details.filter((d) => d.acceptQty !== 0) }
}

export const toPayload = (state: OverseaState) => ({
  shippingInvoiceId: state.shippingInvoiceId,
  shippingInvoiceNo: state.shippingInvoiceNo,
  deliveryNoteNo: state.deliveryNoteNo,
  hShippingInvoiceDetailDTOs: state.details,
})
