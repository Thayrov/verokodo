/**
 * Purpose: Encapsulate oracle page UI state transitions, DOM rendering, and local interaction state.
 * Interface: createOracleUiState(...) -> initialize/startLoading/completeReading/reset/fail + getters.
 * Invariants: DOM updates stay consistent with `data-state` and loading timers are always cleaned up.
 * Decisions: keep mutable UI state in one module to reduce cognitive load in event wiring code.
 */

import type {
  CrystalController,
  OracleCopy,
  OracleElements,
  OracleReading,
  OracleState,
  OracleUiState,
  RecentUsernamesStore,
  RenderParagraphs,
  ValidateUsername
} from './types'
import { createLoadingFeedback } from './state/loading-feedback'
import { createRecentUsernamesUi } from './state/recent-usernames-ui'
import { createResultRenderer } from './state/result-renderer'

export function createOracleUiState({
  elements,
  copy,
  crystal,
  validateUsername,
  recentUsernamesStore,
  renderParagraphs
}: {
  elements: OracleElements
  copy: OracleCopy
  crystal: CrystalController
  validateUsername: ValidateUsername
  recentUsernamesStore: RecentUsernamesStore
  renderParagraphs: RenderParagraphs
}): OracleUiState {
  const crystalMoments = {
    beforeSearch: { zoom: 0.08, activity: 0.45 },
    loading: { zoom: 1.35, activity: 1.05 },
    afterSearch: { zoom: 0.18, activity: 0.58 }
  }

  let recentUsernames: string[] = []
  let latestError = ''
  let latestReading: OracleReading | null = null

  const loadingFeedback = createLoadingFeedback({
    elements,
    copy,
    isLoading: () => elements.experience.dataset.state === 'loading'
  })

  const recentUsernamesUi = createRecentUsernamesUi({
    elements,
    onSelectUsername: (username) => {
      elements.usernameInput.value = username
      updateUsernameHint()
      updateInputInteractivity()
      elements.usernameInput.focus()
      elements.usernameInput.select()
    }
  })

  const resultRenderer = createResultRenderer({
    elements,
    copy,
    renderParagraphs
  })

  function announce(message: string): void {
    if (!(elements.announceNode instanceof HTMLElement)) return
    elements.announceNode.textContent = ''
    window.requestAnimationFrame(() => {
      elements.announceNode.textContent = message
    })
  }

  function updateInputInteractivity() {
    const isLoading = elements.experience.dataset.state === 'loading'
    const usernameValid = validateUsername(elements.usernameInput.value.trim())
    const shouldDisableStart = isLoading || !usernameValid || !navigator.onLine

    elements.usernameInput.disabled = isLoading

    if (elements.startButton instanceof HTMLButtonElement) {
      elements.startButton.disabled = shouldDisableStart
      elements.startButton.setAttribute('aria-disabled', shouldDisableStart ? 'true' : 'false')
    }

    if (elements.cancelReadingButton instanceof HTMLButtonElement) {
      elements.cancelReadingButton.disabled = !isLoading
    }
  }

  function setState(nextState: OracleState, { immediate = false }: { immediate?: boolean } = {}): void {
    elements.experience.dataset.state = nextState
    elements.experience.setAttribute('aria-busy', nextState === 'loading' ? 'true' : 'false')

    const moment: keyof typeof crystalMoments =
      nextState === 'idle' ? 'beforeSearch' : nextState === 'loading' ? 'loading' : 'afterSearch'
    crystal.setZoomTarget(crystalMoments[moment].zoom, immediate)
    crystal.setActivityTarget(crystalMoments[moment].activity, immediate)
    updateInputInteractivity()
  }

  function updateUsernameHint(): void {
    if (!(elements.usernameHint instanceof HTMLElement)) return

    const username = elements.usernameInput.value.trim()
    if (!username) {
      elements.usernameHint.textContent = navigator.onLine ? copy.usernameHintIdle : copy.offlineHint
      elements.usernameHint.dataset.valid = 'unknown'
      elements.usernameInput.setAttribute('aria-invalid', 'false')
      return
    }

    if (validateUsername(username)) {
      elements.usernameHint.textContent = copy.usernameHintValid
      elements.usernameHint.dataset.valid = 'valid'
      elements.usernameInput.setAttribute('aria-invalid', 'false')
      return
    }

    elements.usernameHint.textContent = copy.usernameHintInvalid
    elements.usernameHint.dataset.valid = 'invalid'
    elements.usernameInput.setAttribute('aria-invalid', 'true')
  }

  function applyPrefilledUsername(): void {
    const username = new URLSearchParams(window.location.search).get('username')?.trim() ?? ''
    if (validateUsername(username)) {
      elements.usernameInput.value = username
    }
  }

  return {
    initialize() {
      recentUsernames = recentUsernamesStore.read()
      recentUsernamesUi.render(recentUsernames)
      applyPrefilledUsername()
      setState('idle', { immediate: true })
      loadingFeedback.reset()
      updateUsernameHint()
      updateInputInteractivity()
    },
    updateInteractiveState() {
      updateUsernameHint()
      updateInputInteractivity()
    },
    startLoading() {
      setState('loading')
      announce(copy.announceLoading)
      loadingFeedback.start()
    },
    completeReading(reading: OracleReading) {
      const elapsedSeconds = loadingFeedback.completeAndGetElapsedSeconds()
      latestReading = reading
      recentUsernames = recentUsernamesStore.remember(recentUsernames, reading.username)
      recentUsernamesUi.render(recentUsernames)
      resultRenderer.render(reading, elapsedSeconds)

      const historyUrl = new URL(window.location.href)
      historyUrl.searchParams.set('username', reading.username)
      window.history.replaceState({}, '', historyUrl)
      window.setTimeout(() => {
        setState('result')
        announce(copy.announceResult)
      }, 120)
    },
    failWithError(message: string) {
      latestError = message
      resultRenderer.setError(message)
      setState('error')
      announce(copy.announceError)
    },
    resetToIdle({ preserveInput = false, announcement = copy.announceIdle } = {}) {
      loadingFeedback.reset()
      latestError = ''
      latestReading = null
      resultRenderer.clear()
      setState('idle')
      announce(announcement)

      if (!preserveInput) {
        elements.usernameInput.value = ''
      }

      updateUsernameHint()
      elements.usernameInput.focus()
    },
    clearRecent() {
      recentUsernames = recentUsernamesStore.clear()
      recentUsernamesUi.render(recentUsernames)
      announce(copy.recentCleared)
    },
    setResultNotice(message: string) {
      if (!resultRenderer.setNotice(message)) return false
      announce(message)
      return true
    },
    getLatestError() {
      return latestError
    },
    getLatestReading() {
      return latestReading
    },
    destroy() {
      loadingFeedback.stop()
      crystal.destroy()
    }
  }
}
