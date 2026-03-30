/**
 * Purpose: Encapsulate recent-username persistence and recency ordering in localStorage.
 * Interface: createRecentUsernamesStore({ validateUsername }) -> read/remember/clear.
 * Invariants: stored usernames are validated and bounded by max item count.
 * Decisions: fail soft on storage errors to keep interaction flow uninterrupted.
 */

import type { RecentUsernamesStore, ValidateUsername } from './types'

const storageKey = 'verokodo.recent-usernames.v1'
const maxRecentUsernames = 6

export function createRecentUsernamesStore({
  validateUsername
}: {
  validateUsername: ValidateUsername
}): RecentUsernamesStore {
  function read(): string[] {
    try {
      const serialized = window.localStorage.getItem(storageKey)
      if (!serialized) return []

      const parsed = JSON.parse(serialized)
      if (!Array.isArray(parsed)) return []

      return parsed
        .filter((value) => typeof value === 'string' && validateUsername(value))
        .slice(0, maxRecentUsernames)
    } catch {
      return []
    }
  }

  function write(nextUsernames: string[]): void {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextUsernames))
    } catch {
      return
    }
  }

  return {
    read,
    remember(currentUsernames, username) {
      const next = [username, ...currentUsernames.filter((value) => value !== username)].slice(0, maxRecentUsernames)
      write(next)
      return next
    },
    clear() {
      write([])
      return []
    }
  }
}
