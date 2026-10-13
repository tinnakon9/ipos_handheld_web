import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ServiceUnavailableError, SessionExpiredError } from '../api/client'
import { useSession } from './session'
import { useUi } from './ui'

/** Wraps API calls: expired session -> back to login, network failure -> toast. Returns undefined on failure. */
export function useGuard() {
  const nav = useNavigate()
  const { logout } = useSession()
  const { notify } = useUi()
  return useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn()
      } catch (e) {
        if (e instanceof SessionExpiredError) {
          notify(e.message, 'error')
          logout()
          nav('/login', { replace: true })
          return undefined
        }
        if (e instanceof ServiceUnavailableError) {
          notify(e.message, 'error')
          return undefined
        }
        throw e
      }
    },
    [nav, logout, notify],
  )
}
