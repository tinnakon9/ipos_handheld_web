import { useCallback, useState } from 'react'

const PREFIX = 'draft:'

/** useState that survives a page refresh (sessionStorage) so scanned work isn't lost mid-task. */
export function usePersistentState<T>(key: string, initial: T) {
  const storageKey = PREFIX + key
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        sessionStorage.setItem(storageKey, JSON.stringify(v))
        return v
      })
    },
    [storageKey],
  )
  const clear = useCallback(() => {
    sessionStorage.removeItem(storageKey)
    setValue(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])
  return [value, set, clear] as const
}

/** Mirrors the handheld's "delete all local tables" on login/logout. */
export function clearAllDrafts() {
  Object.keys(sessionStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => sessionStorage.removeItem(k))
}
