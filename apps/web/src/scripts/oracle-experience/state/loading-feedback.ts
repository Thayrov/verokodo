/**
 * Purpose: Own loading-status copy, progress animation, and elapsed-time tracking.
 * Interface: createLoadingFeedback(...) returns start/reset/stop/complete helpers.
 * Invariants: timers are always cleared before restart and on destroy.
 * Decisions: keep loading timing isolated to avoid state-transition coupling.
 */

import type { OracleCopy, OracleElements } from '../types'

type LoadingFeedback = {
  start: () => void
  reset: () => void
  stop: () => void
  completeAndGetElapsedSeconds: () => number
}

export function createLoadingFeedback({
  elements,
  copy,
  isLoading
}: {
  elements: OracleElements
  copy: OracleCopy
  isLoading: () => boolean
}): LoadingFeedback {
  let loadingElapsedInterval = 0
  let loadingTimeoutA = 0
  let loadingTimeoutB = 0
  let loadingStartedAt = 0

  function updateLoadingProgress(progress: number): void {
    if (!(elements.loadingProgressBar instanceof HTMLElement)) return
    const clamped = Math.max(0, Math.min(1, progress))
    elements.loadingProgressBar.style.setProperty('--loading-progress', String(clamped))
  }

  function stop(): void {
    if (loadingElapsedInterval) {
      window.clearInterval(loadingElapsedInterval)
      loadingElapsedInterval = 0
    }

    if (loadingTimeoutA) {
      window.clearTimeout(loadingTimeoutA)
      loadingTimeoutA = 0
    }

    if (loadingTimeoutB) {
      window.clearTimeout(loadingTimeoutB)
      loadingTimeoutB = 0
    }
  }

  function reset(): void {
    stop()
    updateLoadingProgress(0)

    if (elements.loadingStatus instanceof HTMLElement) {
      elements.loadingStatus.textContent = copy.loadingStatusA
    }

    if (elements.loadingMeta instanceof HTMLElement) {
      elements.loadingMeta.textContent = copy.loadingMeta(1, 3, 0)
    }
  }

  function start(): void {
    stop()
    loadingStartedAt = performance.now()

    const refresh = (): void => {
      if (!isLoading() || !(elements.loadingMeta instanceof HTMLElement)) return

      const elapsedSeconds = (performance.now() - loadingStartedAt) / 1000
      const elapsedRatio = Math.min(0.98, elapsedSeconds / 7.5)
      updateLoadingProgress(0.1 + elapsedRatio * 0.88)

      let step = 1
      if (elapsedSeconds >= 1.8) step = 3
      else if (elapsedSeconds >= 0.9) step = 2

      elements.loadingMeta.textContent = copy.loadingMeta(step, 3, elapsedSeconds)
    }

    refresh()
    loadingElapsedInterval = window.setInterval(refresh, 120)

    loadingTimeoutA = window.setTimeout(() => {
      if (!isLoading() || !(elements.loadingStatus instanceof HTMLElement)) return
      elements.loadingStatus.textContent = copy.loadingStatusB
      updateLoadingProgress(0.42)
    }, 900)

    loadingTimeoutB = window.setTimeout(() => {
      if (!isLoading() || !(elements.loadingStatus instanceof HTMLElement)) return
      elements.loadingStatus.textContent = copy.loadingStatusC
      updateLoadingProgress(0.77)
    }, 1800)
  }

  function completeAndGetElapsedSeconds(): number {
    stop()
    updateLoadingProgress(1)
    if (loadingStartedAt === 0) {
      return 0
    }

    return (performance.now() - loadingStartedAt) / 1000
  }

  return {
    start,
    reset,
    stop,
    completeAndGetElapsedSeconds
  }
}
