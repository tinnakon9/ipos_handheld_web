import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ServiceUnavailableError, SessionExpiredError } from '../api/client'
import { useSession } from './session'
import { useUi } from './ui'

export const RESEND_MESSAGE = 'Service not avaliable please contact GEC.\nDo you want to resend data ?'

/**
 * Wraps API calls the way the handheld forms did:
 * - session errors: show the message and return to Login
 * - guard(): network failure -> "Service not avaliable please contact GEC." (undefined)
 * - guardResend(): network failure -> "resend data ?"; Yes retries, No returns 'cancel'
 */
export function useGuard() {
  const nav = useNavigate()
  const { logout } = useSession()
  const { alert, confirm } = useUi()

  const expired = useCallback(
    async (e: SessionExpiredError) => {
      await alert(e.message, 'Error')
      logout()
      nav('/login', { replace: true })
    },
    [alert, logout, nav],
  )

  const guard = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn()
      } catch (e) {
        if (e instanceof SessionExpiredError) return void (await expired(e))
        if (e instanceof ServiceUnavailableError) return void (await alert(e.message, 'Error'))
        throw e
      }
    },
    [alert, expired],
  )

  const guardResend = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | 'cancel' | undefined> => {
      for (;;) {
        try {
          return await fn()
        } catch (e) {
          if (e instanceof SessionExpiredError) return void (await expired(e))
          if (e instanceof ServiceUnavailableError) {
            if (await confirm(RESEND_MESSAGE, 'Error')) continue
            return 'cancel'
          }
          throw e
        }
      }
    },
    [confirm, expired],
  )

  return Object.assign(guard, { resend: guardResend })
}
