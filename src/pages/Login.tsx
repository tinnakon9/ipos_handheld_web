import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { UserInfoResult } from '../api/types'
import { useGuard } from '../state/guard'
import { useSession } from '../state/session'
import { useUi } from '../state/ui'

export function Login() {
  const { session, login } = useSession()
  const { notify } = useUi()
  const guard = useGuard()
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await guard(() => api.post<UserInfoResult>('/handheld/login', { username: username.trim(), password: password.trim() }))
    setBusy(false)
    if (!res) return
    if (res.status === 'SUCCESS' && res.token && res.sessionId) {
      login({ token: res.token, sessionId: res.sessionId, userName: res.result.userName })
      nav('/', { replace: true })
    } else {
      notify(`${res.status}: ${res.message ?? ''}`, 'error')
    }
  }

  return (
    <div className="page login">
      <form onSubmit={submit}>
        <h1>IPOS Handheld</h1>
        <input placeholder="Username" value={username} autoFocus autoCapitalize="off" autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="Password" type="password" value={password} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-primary block" disabled={busy || !username.trim() || !password.trim()}>
          {busy ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </div>
  )
}
