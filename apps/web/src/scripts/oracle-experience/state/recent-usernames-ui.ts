/**
 * Purpose: Render and wire recent-username affordances for quick input reuse.
 * Interface: createRecentUsernamesUi(...) returns a render(usernames) method.
 * Invariants: datalist options and chip buttons always reflect the same source array.
 * Decisions: expose explicit chips because datalist arrows are inconsistent across browsers.
 */

import type { OracleElements } from '../types'

type RecentUsernamesUi = {
  render: (usernames: string[]) => void
}

export function createRecentUsernamesUi({
  elements,
  onSelectUsername
}: {
  elements: OracleElements
  onSelectUsername: (username: string) => void
}): RecentUsernamesUi {
  function renderDatalist(usernames: string[]): void {
    if (!(elements.recentUsernamesDatalist instanceof HTMLDataListElement)) return

    elements.recentUsernamesDatalist.innerHTML = ''
    for (const username of usernames) {
      const option = document.createElement('option')
      option.value = username
      elements.recentUsernamesDatalist.append(option)
    }
  }

  function renderChips(usernames: string[]): void {
    if (!(elements.recentUsernamesList instanceof HTMLElement)) return

    elements.recentUsernamesList.innerHTML = ''
    for (const username of usernames) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'recent-username-chip'
      button.textContent = username
      button.addEventListener('click', () => {
        onSelectUsername(username)
      })
      elements.recentUsernamesList.append(button)
    }
  }

  return {
    render(usernames: string[]) {
      renderDatalist(usernames)
      renderChips(usernames)
      const hasRecentUsernames = usernames.length > 0

      if (elements.clearRecentButton instanceof HTMLButtonElement) {
        elements.clearRecentButton.hidden = !hasRecentUsernames
        elements.clearRecentButton.disabled = !hasRecentUsernames
      }

      if (elements.recentUsernamesPanel instanceof HTMLElement) {
        elements.recentUsernamesPanel.hidden = !hasRecentUsernames
      }

      if (elements.recentUsernamesTitle instanceof HTMLElement) {
        elements.recentUsernamesTitle.hidden = !hasRecentUsernames
      }
    }
  }
}
