/**
 * Purpose: Encapsulate oracle page UI state transitions, DOM rendering, and local interaction state.
 * Interface: createOracleUiState(...) -> initialize/startLoading/completeReading/reset/fail + getters.
 * Invariants: DOM updates stay consistent with `data-state` and loading timers are always cleaned up.
 * Decisions: keep mutable UI state in one module to reduce cognitive load in event wiring code.
 */

export function createOracleUiState({
  elements,
  copy,
  crystal,
  validateUsername,
  recentUsernamesStore,
  renderParagraphs
}) {
  const crystalMoments = {
    beforeSearch: { zoom: 0.08, activity: 0.45 },
    loading: { zoom: 1.18, activity: 1.05 },
    afterSearch: { zoom: 0.18, activity: 0.58 }
  }

  let recentUsernames = []
  let latestError = ''
  let latestReading = null
  let loadingElapsedInterval = 0
  let loadingTimeoutA = 0
  let loadingTimeoutB = 0
  let loadingStartedAt = 0

  function announce(message) {
    if (!(elements.announceNode instanceof HTMLElement)) return
    elements.announceNode.textContent = ''
    window.requestAnimationFrame(() => {
      elements.announceNode.textContent = message
    })
  }

  function updateLoadingProgress(progress) {
    if (!(elements.loadingProgressBar instanceof HTMLElement)) return
    const clamped = Math.max(0, Math.min(1, progress))
    elements.loadingProgressBar.style.setProperty('--loading-progress', String(clamped))
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

  function setState(nextState, { immediate = false } = {}) {
    elements.experience.dataset.state = nextState
    elements.experience.setAttribute('aria-busy', nextState === 'loading' ? 'true' : 'false')

    const moment = nextState === 'idle' ? 'beforeSearch' : nextState === 'loading' ? 'loading' : 'afterSearch'
    crystal.setZoomTarget(crystalMoments[moment].zoom, immediate)
    crystal.setActivityTarget(crystalMoments[moment].activity, immediate)
    updateInputInteractivity()
  }

  function stopLoadingTimers() {
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

  function startLoadingTimers() {
    stopLoadingTimers()
    loadingStartedAt = performance.now()

    const refresh = () => {
      if (!(elements.loadingMeta instanceof HTMLElement)) return

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
      if (elements.experience.dataset.state !== 'loading' || !(elements.loadingStatus instanceof HTMLElement)) return
      elements.loadingStatus.textContent = copy.loadingStatusB
      updateLoadingProgress(0.42)
    }, 900)

    loadingTimeoutB = window.setTimeout(() => {
      if (elements.experience.dataset.state !== 'loading' || !(elements.loadingStatus instanceof HTMLElement)) return
      elements.loadingStatus.textContent = copy.loadingStatusC
      updateLoadingProgress(0.77)
    }, 1800)
  }

  function hydrateRecentUsernames() {
    if (!(elements.recentUsernamesDatalist instanceof HTMLDataListElement)) return
    elements.recentUsernamesDatalist.innerHTML = ''

    for (const username of recentUsernames) {
      const option = document.createElement('option')
      option.value = username
      elements.recentUsernamesDatalist.append(option)
    }

    if (elements.clearRecentButton instanceof HTMLButtonElement) {
      elements.clearRecentButton.hidden = recentUsernames.length === 0
      elements.clearRecentButton.disabled = recentUsernames.length === 0
    }
  }

  function updateUsernameHint() {
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

  function mountSignal(label, value) {
    if (!(elements.signalGrid instanceof HTMLElement)) return
    const card = document.createElement('article')
    card.className = 'signal-card'

    const labelNode = document.createElement('p')
    labelNode.className = 'signal-label'
    labelNode.textContent = label

    const valueNode = document.createElement('p')
    valueNode.className = 'signal-value'
    valueNode.textContent = value

    card.append(labelNode, valueNode)
    elements.signalGrid.append(card)
  }

  function clearResultContent() {
    latestError = ''
    latestReading = null
    if (elements.errorText instanceof HTMLElement) elements.errorText.textContent = ''
    if (elements.resultSummary instanceof HTMLElement) elements.resultSummary.textContent = ''
    if (elements.resultProphecy instanceof HTMLElement) elements.resultProphecy.innerHTML = ''
    if (elements.resultFiveYear instanceof HTMLElement) elements.resultFiveYear.textContent = ''
    if (elements.resultTenYear instanceof HTMLElement) elements.resultTenYear.textContent = ''
    if (elements.signalGrid instanceof HTMLElement) elements.signalGrid.innerHTML = ''
    if (elements.resultMeta instanceof HTMLElement) elements.resultMeta.textContent = ''
  }

  function applyPrefilledUsername() {
    const username = new URLSearchParams(window.location.search).get('username')?.trim() ?? ''
    if (validateUsername(username)) {
      elements.usernameInput.value = username
    }
  }

  return {
    initialize() {
      recentUsernames = recentUsernamesStore.read()
      hydrateRecentUsernames()
      applyPrefilledUsername()
      setState('idle', { immediate: true })
      updateLoadingProgress(0)
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
      startLoadingTimers()
    },
    completeReading(reading) {
      stopLoadingTimers()
      updateLoadingProgress(1)

      const elapsedSeconds = (performance.now() - loadingStartedAt) / 1000
      latestReading = reading
      recentUsernames = recentUsernamesStore.remember(recentUsernames, reading.username)
      hydrateRecentUsernames()

      if (elements.resultTitle instanceof HTMLElement) {
        elements.resultTitle.textContent = `${copy.resultTitlePrefix} @${reading.username}`
      }

      if (elements.resultSummary instanceof HTMLElement) elements.resultSummary.textContent = reading.summary
      if (elements.resultProphecy instanceof HTMLElement) elements.resultProphecy.innerHTML = renderParagraphs(reading.prophecy)
      if (elements.resultFiveYear instanceof HTMLElement) elements.resultFiveYear.textContent = reading.fiveYearOutlook
      if (elements.resultTenYear instanceof HTMLElement) elements.resultTenYear.textContent = reading.tenYearOutlook
      if (elements.resultMeta instanceof HTMLElement) elements.resultMeta.textContent = copy.resultMeta(elapsedSeconds)
      if (elements.signalGrid instanceof HTMLElement) elements.signalGrid.innerHTML = ''

      mountSignal(copy.followers, String(reading.signals.followers))
      mountSignal(copy.publicRepos, String(reading.signals.publicRepos))
      mountSignal(copy.topLanguages, reading.signals.topLanguages.join(', ') || copy.unknown)
      mountSignal(copy.recentRepos, reading.signals.recentRepoNames.join(', ') || copy.unknown)

      const historyUrl = new URL(window.location.href)
      historyUrl.searchParams.set('username', reading.username)
      window.history.replaceState({}, '', historyUrl)
      window.setTimeout(() => {
        setState('result')
        announce(copy.announceResult)
      }, 120)
    },
    failWithError(message) {
      latestError = message
      if (elements.errorText instanceof HTMLElement) {
        elements.errorText.textContent = message
      }
      setState('error')
      announce(copy.announceError)
    },
    resetToIdle({ preserveInput = false, announcement = copy.announceIdle } = {}) {
      stopLoadingTimers()
      updateLoadingProgress(0)
      if (elements.loadingStatus instanceof HTMLElement) elements.loadingStatus.textContent = copy.loadingStatusA
      if (elements.loadingMeta instanceof HTMLElement) elements.loadingMeta.textContent = copy.loadingMeta(1, 3, 0)
      clearResultContent()
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
      hydrateRecentUsernames()
      announce(copy.recentCleared)
    },
    setResultNotice(message) {
      if (elements.experience.dataset.state !== 'result' || !(elements.resultMeta instanceof HTMLElement)) {
        return false
      }

      elements.resultMeta.textContent = message
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
      stopLoadingTimers()
      crystal.destroy()
    }
  }
}
