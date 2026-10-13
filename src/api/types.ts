export interface ApiEnvelope<T> {
  status: string
  message?: string
  token?: string
  sessionId?: string
  result: T
}

export interface UserInfoResult {
  userId: number
  loginName: string
  userName: string
  userLastname?: string
}

export interface ItemResult {
  status: string
  reason?: string
}
export interface ReceiptResult extends ItemResult { deliverySlipNo: string; invoiceFlag: boolean }
export interface StockInResult extends ItemResult { tagNo: string; type: string; shelfNo: string }
export interface ChangeLocationResult extends ItemResult { tagNo: string; type: string; currentShelf?: string; toShelf: string }

export interface ShippingDetail {
  iszjPo: string
  itaPo: string
  partName: string
  shipQty: number
  tagNo?: string
  partRcvFlag?: string
}
export interface ShippingStock { stockInfoId: string; tagNo: string; iszjPo: string; itaPo: string; qty: number }
export interface ShippingDoc {
  shippingInvoiceId: string
  shippingInvoiceNo: string
  deliveryNoteNo: string
  hShippingInvoiceDetailDTOs: ShippingDetail[]
  hStocks?: ShippingStock[]
}

export interface RsoDetail {
  requestStockDetailId: string
  iszjPo: string
  itaPo: string
  iszjQty: number
  requestQty: number
}
export interface RsoDoc {
  requestStockOutId: string
  /** The server spells this `reqeustNo` in GET responses (and `requestNo` in PUT bodies). */
  reqeustNo?: string
  requestNo?: string
  hRequestStockOutDetailDTOs: RsoDetail[]
  hStocks: ShippingStock[]
}
