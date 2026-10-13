import type { ApiEnvelope } from './types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'https://ipos.gec.co.th/controller-api'

/** Server messages that the handheld app treated as "go back to login". */
const SESSION_MESSAGES = ['Unauthorize', 'No Permission', 'Session Time Out', 'Unknown Error']

export class SessionExpiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

export class ServiceUnavailableError extends Error {
  constructor() {
    super('Service not available please contact GEC.')
    this.name = 'ServiceUnavailableError'
  }
}

export interface Auth {
  token: string
  sessionId: string
}

let auth: Auth | null = null
export const setAuth = (a: Auth | null) => {
  auth = a
}

async function request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (auth) headers.Authorization = `fixed:${auth.token}:${auth.sessionId}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ServiceUnavailableError()
  }

  let json: ApiEnvelope<T>
  try {
    json = (await res.json()) as ApiEnvelope<T>
  } catch {
    throw new ServiceUnavailableError()
  }

  if (auth && json.status === 'FAIL' && json.message && SESSION_MESSAGES.includes(json.message)) {
    throw new SessionExpiredError(json.message)
  }
  return json
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
}
