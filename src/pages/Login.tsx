import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { UserInfoResult } from '../api/types'
import { useGuard } from '../state/guard'
import { useSession } from '../state/session'
import { useUi } from '../state/ui'

export function Login() {
  const { session, login } = useSession()
  const { alert, confirm } = useUi()
  const guard = useGuard()
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const submit = async () => {
    setBusy(true)
    const res = await guard(() => api.post<UserInfoResult>('/handheld/login', { username: username.trim(), password: password.trim() }))
    setBusy(false)
    if (!res) return
    if (res.status === 'SUCCESS' && res.token && res.sessionId) {
      login({ token: res.token, sessionId: res.sessionId, userName: res.result.userName })
      nav('/', { replace: true })
    } else {
      await alert(`${res.status}:${res.message ?? ''}`, 'Error')
    }
  }

  const exit = async () => {
    if (await confirm('Do you want to exit ?', 'Exit (Y/N).')) {
      setUsername('')
      setPassword('')
      window.close()
    }
  }

  return (
    <div className="frame login">
      <div className="login-body">
        <h1>GECS</h1>
        <input
          placeholder="Username"
          value={username}
          autoFocus
          autoCapitalize="off"
          autoComplete="username"
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && document.getElementById('pw')?.focus()}
        />
        <input
          id="pw"
          placeholder="Password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), document.getElementById('login-btn')?.focus())}
        />
        <div className="row">
          <button id="login-btn" className="btn btn-green" disabled={busy} onClick={submit}>Login</button>
          <button className="btn btn-red" onClick={exit}>Exit</button>
        </div>
      </div>
      <footer className="login-foot">
        <span>Status : {navigator.onLine ? 'Connected' : 'Offline'}</span>
        <span>Version : 1.0.0.1</span>
      </footer>
    </div>
  )
}
