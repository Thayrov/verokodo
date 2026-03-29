import { createCrystalBallScene } from './crystal-ball-scene'

const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:3000'

const recentUsernamesStorageKey = 'verokodo.recent-usernames.v1'
const maxRecentUsernames = 6
const githubUsernamePattern = /^[A-Za-z0-9](?:[A-Za-z0-9]|-){0,37}$/

const messages = {
  en: {
    title: 'Verokodo',
    usernameLabel: 'GitHub Username',
    startButton: 'Go',
    startButtonAria: 'Start reading',
    note: 'Use your GitHub username to get a glimpse of your dev future.',
    usernameHintIdle: 'Only public GitHub usernames are supported.',
    usernameHintValid: 'Looks good. Press Enter to start.',
    usernameHintInvalid: 'Use 1-39 letters, numbers, or hyphens. No spaces.',
    shortcutHint: 'Press / to focus',
    clearRecent: 'Clear recent',
    recentCleared: 'Recent usernames cleared.',
    loadingLabel: 'Reading in progress',
    loadingStatusA: 'Collecting profile signals...',
    loadingStatusB: 'Mapping coding patterns...',
    loadingStatusC: 'Writing final reading...',
    loadingMeta: (step, total, elapsedSeconds) => `Step ${step} of ${total} - ${elapsedSeconds.toFixed(1)}s`,
    cancelButton: 'Cancel',
    loadingCancelled: 'Reading canceled.',
    errorCopyButton: 'Copy Error',
    retryButton: 'Try Again',
    resultEyebrow: 'Reading complete',
    resultTitlePrefix: 'Reading for',
    fiveYearLabel: '5-year outlook',
    tenYearLabel: '10-year outlook',
    goBack: 'Go back',
    copyShareButton: 'Copy Share Line',
    copyLinkButton: 'Copy Result Link',
    shareButton: 'Share Reading',
    copied: 'Copied',
    resultMeta: (elapsedSeconds) => `Generated in ${elapsedSeconds.toFixed(1)}s from public profile signals.`,
    followers: 'Followers',
    publicRepos: 'Public repos',
    topLanguages: 'Top languages',
    recentRepos: 'Recent repos',
    unknown: 'Unknown',
    invalidUsername: 'Invalid GitHub username.',
    requestFailed: (status) => `Request failed (HTTP ${status}).`,
    clipboardFailed: 'Unable to access clipboard.',
    unexpectedClientError: 'Unexpected client error.',
    offlineHint: 'You are offline. Reconnect to start a reading.',
    shareTitle: 'Verokodo reading',
    shareUnavailable: 'Native sharing is not available in this browser.',
    announceLoading: 'Reading started.',
    announceResult: 'Reading ready.',
    announceError: 'Reading failed.',
    announceIdle: 'Ready for a new reading.'
  },
  es: {
    title: 'Verokodo',
    usernameLabel: 'Usuario de GitHub',
    startButton: 'Ir',
    startButtonAria: 'Iniciar lectura',
    note: 'Usa tu usuario de GitHub para ver un vistazo de tu futuro dev.',
    usernameHintIdle: 'Solo se admiten usuarios publicos de GitHub.',
    usernameHintValid: 'Todo listo. Presiona Enter para iniciar.',
    usernameHintInvalid: 'Usa 1-39 letras, numeros o guiones. Sin espacios.',
    shortcutHint: 'Presiona / para enfocar',
    clearRecent: 'Borrar recientes',
    recentCleared: 'Usuarios recientes eliminados.',
    loadingLabel: 'Lectura en progreso',
    loadingStatusA: 'Recolectando senales del perfil...',
    loadingStatusB: 'Mapeando patrones de codigo...',
    loadingStatusC: 'Escribiendo lectura final...',
    loadingMeta: (step, total, elapsedSeconds) => `Paso ${step} de ${total} - ${elapsedSeconds.toFixed(1)}s`,
    cancelButton: 'Cancelar',
    loadingCancelled: 'Lectura cancelada.',
    errorCopyButton: 'Copiar error',
    retryButton: 'Reintentar',
    resultEyebrow: 'Lectura lista',
    resultTitlePrefix: 'Lectura de',
    fiveYearLabel: 'Proyeccion a 5 anos',
    tenYearLabel: 'Proyeccion a 10 anos',
    goBack: 'Volver',
    copyShareButton: 'Copiar texto para compartir',
    copyLinkButton: 'Copiar link del resultado',
    shareButton: 'Compartir lectura',
    copied: 'Copiado',
    resultMeta: (elapsedSeconds) => `Generado en ${elapsedSeconds.toFixed(1)}s con senales publicas del perfil.`,
    followers: 'Seguidores',
    publicRepos: 'Repos publicos',
    topLanguages: 'Lenguajes principales',
    recentRepos: 'Repos recientes',
    unknown: 'Desconocido',
    invalidUsername: 'Usuario de GitHub invalido.',
    requestFailed: (status) => `El request fallo (HTTP ${status}).`,
    clipboardFailed: 'No se pudo copiar al portapapeles.',
    unexpectedClientError: 'Error inesperado en cliente.',
    offlineHint: 'No tienes conexion. Reconecta para iniciar una lectura.',
    shareTitle: 'Lectura de Verokodo',
    shareUnavailable: 'Compartir no esta disponible en este navegador.',
    announceLoading: 'La lectura inicio.',
    announceResult: 'La lectura esta lista.',
    announceError: 'La lectura fallo.',
    announceIdle: 'Listo para una nueva lectura.'
  }
}

function detectLocale() {
  const browserLocales = [
    ...(navigator.languages ?? []),
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().locale
  ].filter(Boolean)

  return browserLocales.some((locale) => locale.toLowerCase().startsWith('es')) ? 'es' : 'en'
}

const locale = detectLocale()
const copy = messages[locale]
document.documentElement.lang = locale

const crystalCanvas = document.getElementById('crystal-canvas')
const experience = document.getElementById('oracle-experience')
const announceNode = document.getElementById('screen-announce')
const oracleForm = document.getElementById('oracle-form')
const usernameInput = document.getElementById('username')
const usernameHint = document.getElementById('username-hint')
const usernameShortcut = document.getElementById('username-shortcut')
const recentUsernamesDatalist = document.getElementById('recent-usernames')
const clearRecentButton = document.getElementById('clear-recent')
const loadingLabel = document.getElementById('loading-label')
const loadingStatus = document.getElementById('loading-status')
const loadingMeta = document.getElementById('loading-meta')
const loadingProgressBar = document.getElementById('loading-progress-bar')
const cancelReadingButton = document.getElementById('cancel-reading')
const errorText = document.getElementById('error-text')
const copyErrorButton = document.getElementById('copy-error')
const retryReadingButton = document.getElementById('retry-reading')
const resultEyebrow = document.getElementById('result-eyebrow')
const resultTitle = document.getElementById('result-title')
const resultSummary = document.getElementById('result-summary')
const resultProphecy = document.getElementById('result-prophecy')
const resultFiveYear = document.getElementById('result-five-year')
const resultTenYear = document.getElementById('result-ten-year')
const resultFiveYearLabel = document.getElementById('result-five-year-label')
const resultTenYearLabel = document.getElementById('result-ten-year-label')
const signalGrid = document.getElementById('signal-grid')
const goBackButton = document.getElementById('go-back')
const copyShareButton = document.getElementById('copy-share')
const copyLinkButton = document.getElementById('copy-link')
const shareReadingButton = document.getElementById('share-reading')
const resultMeta = document.getElementById('result-meta')

if (
  !(crystalCanvas instanceof HTMLElement) ||
  !(experience instanceof HTMLElement) ||
  !(oracleForm instanceof HTMLFormElement) ||
  !(usernameInput instanceof HTMLInputElement)
) {
  throw new Error('Oracle experience mount failed.')
}

const crystal = createCrystalBallScene(crystalCanvas)

const crystalMoments = {
  beforeSearch: { zoom: 0.08, activity: 0.45 },
  loading: { zoom: 1.18, activity: 1.05 },
  afterSearch: { zoom: 0.18, activity: 0.58 }
}

let latestError = ''
let activeRequestController = null
let loadingElapsedInterval = 0
let loadingTimeoutA = 0
let loadingTimeoutB = 0
let loadingStartedAt = 0
let latestReading = null
let recentUsernames = []

function applyCrystalMoment(moment, immediate = false) {
  const target = crystalMoments[moment]
  crystal.setZoomTarget(target.zoom, immediate)
  crystal.setActivityTarget(target.activity, immediate)
}

function setState(nextState, options = {}) {
  const immediate = options.immediate === true
  experience.dataset.state = nextState
  experience.setAttribute('aria-busy', nextState === 'loading' ? 'true' : 'false')

  if (nextState === 'idle') {
    applyCrystalMoment('beforeSearch', immediate)
  } else if (nextState === 'loading') {
    applyCrystalMoment('loading', immediate)
  } else {
    applyCrystalMoment('afterSearch', immediate)
  }

  updateInputInteractivity()
}

function announce(message) {
  if (!(announceNode instanceof HTMLElement)) return
  announceNode.textContent = ''
  window.requestAnimationFrame(() => {
    announceNode.textContent = message
  })
}

function readRecentUsernames() {
  try {
    const serialized = window.localStorage.getItem(recentUsernamesStorageKey)
    if (!serialized) return []

    const parsed = JSON.parse(serialized)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((value) => typeof value === 'string' && githubUsernamePattern.test(value))
      .slice(0, maxRecentUsernames)
  } catch {
    return []
  }
}

function persistRecentUsernames(nextUsernames) {
  recentUsernames = nextUsernames
  try {
    window.localStorage.setItem(recentUsernamesStorageKey, JSON.stringify(nextUsernames))
  } catch {
    return
  }
}

function hydrateRecentUsernames() {
  if (!(recentUsernamesDatalist instanceof HTMLDataListElement)) return

  recentUsernamesDatalist.innerHTML = ''
  for (const username of recentUsernames) {
    const option = document.createElement('option')
    option.value = username
    recentUsernamesDatalist.append(option)
  }

  if (clearRecentButton instanceof HTMLButtonElement) {
    clearRecentButton.hidden = recentUsernames.length === 0
    clearRecentButton.disabled = recentUsernames.length === 0
  }
}

function rememberUsername(username) {
  const next = [username, ...recentUsernames.filter((value) => value !== username)].slice(0, maxRecentUsernames)
  persistRecentUsernames(next)
  hydrateRecentUsernames()
}

function validateUsername(username) {
  return githubUsernamePattern.test(username)
}

function updateUsernameHint() {
  if (!(usernameHint instanceof HTMLElement)) return

  const value = usernameInput.value.trim()
  if (!value) {
    usernameHint.textContent = navigator.onLine ? copy.usernameHintIdle : copy.offlineHint
    usernameHint.dataset.valid = 'unknown'
    usernameInput.setAttribute('aria-invalid', 'false')
    return
  }

  if (validateUsername(value)) {
    usernameHint.textContent = copy.usernameHintValid
    usernameHint.dataset.valid = 'valid'
    usernameInput.setAttribute('aria-invalid', 'false')
    return
  }

  usernameHint.textContent = copy.usernameHintInvalid
  usernameHint.dataset.valid = 'invalid'
  usernameInput.setAttribute('aria-invalid', 'true')
}

function updateInputInteractivity() {
  const isLoading = experience.dataset.state === 'loading'
  const valid = validateUsername(usernameInput.value.trim())
  const disabledForOffline = !navigator.onLine

  usernameInput.disabled = isLoading

  const startButton = document.getElementById('start-button')
  if (startButton instanceof HTMLButtonElement) {
    startButton.disabled = isLoading || !valid || disabledForOffline
    startButton.setAttribute('aria-disabled', startButton.disabled ? 'true' : 'false')
  }

  if (cancelReadingButton instanceof HTMLButtonElement) {
    cancelReadingButton.disabled = !isLoading
  }
}

function updateLoadingProgress(progress) {
  if (!(loadingProgressBar instanceof HTMLElement)) return
  const clamped = Math.max(0, Math.min(1, progress))
  loadingProgressBar.style.setProperty('--loading-progress', String(clamped))
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
    const elapsedSeconds = (performance.now() - loadingStartedAt) / 1000
    const elapsedRatio = Math.min(0.98, elapsedSeconds / 7.5)
    updateLoadingProgress(0.1 + elapsedRatio * 0.88)

    if (loadingMeta instanceof HTMLElement) {
      let step = 1
      if (elapsedSeconds >= 1.8) {
        step = 3
      } else if (elapsedSeconds >= 0.9) {
        step = 2
      }
      loadingMeta.textContent = copy.loadingMeta(step, 3, elapsedSeconds)
    }
  }

  refresh()
  loadingElapsedInterval = window.setInterval(refresh, 120)

  loadingTimeoutA = window.setTimeout(() => {
    if (experience.dataset.state === 'loading' && loadingStatus instanceof HTMLElement) {
      loadingStatus.textContent = copy.loadingStatusB
      updateLoadingProgress(0.42)
    }
  }, 900)

  loadingTimeoutB = window.setTimeout(() => {
    if (experience.dataset.state === 'loading' && loadingStatus instanceof HTMLElement) {
      loadingStatus.textContent = copy.loadingStatusC
      updateLoadingProgress(0.77)
    }
  }, 1800)
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function renderParagraphs(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')
}

function mountSignal(label, value) {
  if (!(signalGrid instanceof HTMLElement)) return
  const card = document.createElement('article')
  card.className = 'signal-card'
  card.innerHTML = `<p class="signal-label">${escapeHtml(label)}</p><p class="signal-value">${escapeHtml(value)}</p>`
  signalGrid.append(card)
}

function parseReading(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error(copy.requestFailed(500))
  }

  const candidate = payload
  if (
    typeof candidate.username !== 'string' ||
    typeof candidate.summary !== 'string' ||
    typeof candidate.prophecy !== 'string' ||
    typeof candidate.fiveYearOutlook !== 'string' ||
    typeof candidate.tenYearOutlook !== 'string' ||
    typeof candidate.shareText !== 'string' ||
    !candidate.signals ||
    typeof candidate.signals !== 'object' ||
    !Array.isArray(candidate.signals.topLanguages) ||
    !Array.isArray(candidate.signals.recentRepoNames)
  ) {
    throw new Error(copy.requestFailed(500))
  }

  return candidate
}

async function readApiError(response) {
  const fallback = copy.requestFailed(response.status)
  try {
    const body = await response.json()
    if (body && typeof body.error === 'string') {
      return `${body.error} (HTTP ${response.status})`
    }
    return fallback
  } catch {
    return fallback
  }
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const helper = document.createElement('textarea')
  helper.value = value
  helper.setAttribute('readonly', 'true')
  helper.style.position = 'fixed'
  helper.style.opacity = '0'
  document.body.append(helper)
  helper.select()
  const copied = document.execCommand('copy')
  helper.remove()

  if (!copied) {
    throw new Error(copy.clipboardFailed)
  }
}

function setTransientButtonText(button, nextLabel, restoreLabel) {
  button.textContent = nextLabel
  window.setTimeout(() => {
    button.textContent = restoreLabel
  }, 1300)
}

function showError(message) {
  latestError = message
  if (errorText instanceof HTMLElement) {
    errorText.textContent = message
  }
  setState('error')
  announce(copy.announceError)
}

function setResultNotice(message) {
  if (experience.dataset.state !== 'result' || !(resultMeta instanceof HTMLElement)) {
    return false
  }

  resultMeta.textContent = message
  announce(message)
  return true
}

function resetResultContent() {
  latestError = ''
  latestReading = null
  if (errorText instanceof HTMLElement) errorText.textContent = ''
  if (resultSummary instanceof HTMLElement) resultSummary.textContent = ''
  if (resultProphecy instanceof HTMLElement) resultProphecy.innerHTML = ''
  if (resultFiveYear instanceof HTMLElement) resultFiveYear.textContent = ''
  if (resultTenYear instanceof HTMLElement) resultTenYear.textContent = ''
  if (signalGrid instanceof HTMLElement) signalGrid.innerHTML = ''
  if (resultMeta instanceof HTMLElement) resultMeta.textContent = ''
}

function resetToIdle(options = {}) {
  const preserveInput = options.preserveInput === true
  const announcement = typeof options.announcement === 'string' ? options.announcement : copy.announceIdle
  stopLoadingTimers()
  updateLoadingProgress(0)

  if (loadingStatus instanceof HTMLElement) {
    loadingStatus.textContent = copy.loadingStatusA
  }

  if (loadingMeta instanceof HTMLElement) {
    loadingMeta.textContent = copy.loadingMeta(1, 3, 0)
  }

  resetResultContent()
  setState('idle')
  announce(announcement)

  if (!preserveInput) {
    usernameInput.value = ''
  }
  updateUsernameHint()
  usernameInput.focus()
}

async function runReading(username) {
  activeRequestController = new AbortController()

  const response = await fetch(`${apiBaseUrl}/oracle`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    signal: activeRequestController.signal,
    body: JSON.stringify({ provider: 'github', username, locale })
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return parseReading(await response.json())
}

function shareLinkForUsername(username) {
  const url = new URL(window.location.href)
  url.searchParams.set('username', username)
  return url.toString()
}

function applyCopyText() {
  const homeTitle = document.getElementById('home-title')
  const usernameLabel = document.getElementById('username-label')
  const startButton = document.getElementById('start-button')
  const homeNote = document.getElementById('home-note')

  if (homeTitle instanceof HTMLElement) homeTitle.textContent = copy.title
  if (usernameLabel instanceof HTMLElement) usernameLabel.textContent = copy.usernameLabel
  if (startButton instanceof HTMLButtonElement) {
    startButton.textContent = copy.startButton
    startButton.setAttribute('aria-label', copy.startButtonAria)
  }
  if (homeNote instanceof HTMLElement) homeNote.textContent = copy.note
  if (usernameHint instanceof HTMLElement) usernameHint.textContent = copy.usernameHintIdle
  if (usernameShortcut instanceof HTMLElement) usernameShortcut.innerHTML = `${copy.shortcutHint.replace('/', '<kbd>/</kbd>')}`
  if (clearRecentButton instanceof HTMLButtonElement) clearRecentButton.textContent = copy.clearRecent
  if (loadingLabel instanceof HTMLElement) loadingLabel.textContent = copy.loadingLabel
  if (loadingStatus instanceof HTMLElement) loadingStatus.textContent = copy.loadingStatusA
  if (loadingMeta instanceof HTMLElement) loadingMeta.textContent = copy.loadingMeta(1, 3, 0)
  if (cancelReadingButton instanceof HTMLButtonElement) cancelReadingButton.textContent = copy.cancelButton
  if (copyErrorButton instanceof HTMLButtonElement) copyErrorButton.textContent = copy.errorCopyButton
  if (retryReadingButton instanceof HTMLButtonElement) retryReadingButton.textContent = copy.retryButton
  if (resultEyebrow instanceof HTMLElement) resultEyebrow.textContent = copy.resultEyebrow
  if (resultFiveYearLabel instanceof HTMLElement) resultFiveYearLabel.textContent = copy.fiveYearLabel
  if (resultTenYearLabel instanceof HTMLElement) resultTenYearLabel.textContent = copy.tenYearLabel
  if (goBackButton instanceof HTMLButtonElement) goBackButton.textContent = copy.goBack
  if (copyShareButton instanceof HTMLButtonElement) copyShareButton.textContent = copy.copyShareButton
  if (copyLinkButton instanceof HTMLButtonElement) copyLinkButton.textContent = copy.copyLinkButton
  if (shareReadingButton instanceof HTMLButtonElement) {
    shareReadingButton.textContent = copy.shareButton
    shareReadingButton.disabled = typeof navigator.share !== 'function'
  }
}

function applyPrefilledUsername() {
  const params = new URLSearchParams(window.location.search)
  const queryUsername = params.get('username')
  if (!queryUsername) return

  const trimmed = queryUsername.trim()
  if (!validateUsername(trimmed)) return

  usernameInput.value = trimmed
}

applyCopyText()
recentUsernames = readRecentUsernames()
hydrateRecentUsernames()
applyPrefilledUsername()
setState('idle', { immediate: true })
updateLoadingProgress(0)
updateUsernameHint()
updateInputInteractivity()

oracleForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const username = usernameInput.value.trim()
  if (!validateUsername(username)) {
    showError(copy.invalidUsername)
    return
  }

  if (!navigator.onLine) {
    showError(copy.offlineHint)
    return
  }

  setState('loading')
  announce(copy.announceLoading)
  startLoadingTimers()

  try {
    const reading = await runReading(username)
    stopLoadingTimers()
    updateLoadingProgress(1)

    const elapsedSeconds = (performance.now() - loadingStartedAt) / 1000
    latestReading = reading
    rememberUsername(reading.username)

    if (resultTitle instanceof HTMLElement) {
      resultTitle.textContent = `${copy.resultTitlePrefix} @${reading.username}`
    }
    if (resultSummary instanceof HTMLElement) {
      resultSummary.textContent = reading.summary
    }
    if (resultProphecy instanceof HTMLElement) {
      resultProphecy.innerHTML = renderParagraphs(reading.prophecy)
    }
    if (resultFiveYear instanceof HTMLElement) {
      resultFiveYear.textContent = reading.fiveYearOutlook
    }
    if (resultTenYear instanceof HTMLElement) {
      resultTenYear.textContent = reading.tenYearOutlook
    }
    if (resultMeta instanceof HTMLElement) {
      resultMeta.textContent = copy.resultMeta(elapsedSeconds)
    }

    if (signalGrid instanceof HTMLElement) {
      signalGrid.innerHTML = ''
    }
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
  } catch (error) {
    stopLoadingTimers()
    updateLoadingProgress(0)
    const aborted = error instanceof DOMException && error.name === 'AbortError'

    if (aborted) {
      resetToIdle({ preserveInput: true, announcement: copy.loadingCancelled })
      return
    }

    const message = error instanceof Error ? error.message : copy.unexpectedClientError
    showError(message)
  } finally {
    activeRequestController = null
  }
})

usernameInput.addEventListener('input', () => {
  updateUsernameHint()
  updateInputInteractivity()
})

clearRecentButton?.addEventListener('click', () => {
  persistRecentUsernames([])
  hydrateRecentUsernames()
  announce(copy.recentCleared)
})

cancelReadingButton?.addEventListener('click', () => {
  if (activeRequestController) {
    activeRequestController.abort()
  }
})

copyErrorButton?.addEventListener('click', async () => {
  if (!latestError) return
  try {
    await copyText(latestError)
    if (copyErrorButton instanceof HTMLButtonElement) {
      setTransientButtonText(copyErrorButton, copy.copied, copy.errorCopyButton)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : copy.clipboardFailed
    showError(message)
  }
})

retryReadingButton?.addEventListener('click', () => {
  resetToIdle({ preserveInput: true })
})

goBackButton?.addEventListener('click', () => {
  resetToIdle({ preserveInput: true })
})

copyShareButton?.addEventListener('click', async () => {
  if (!latestReading) return
  try {
    await copyText(latestReading.shareText)
    if (copyShareButton instanceof HTMLButtonElement) {
      setTransientButtonText(copyShareButton, copy.copied, copy.copyShareButton)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : copy.clipboardFailed
    if (!setResultNotice(message)) {
      showError(message)
    }
  }
})

copyLinkButton?.addEventListener('click', async () => {
  const username = latestReading?.username ?? usernameInput.value.trim()
  if (!username || !validateUsername(username)) return
  try {
    await copyText(shareLinkForUsername(username))
    if (copyLinkButton instanceof HTMLButtonElement) {
      setTransientButtonText(copyLinkButton, copy.copied, copy.copyLinkButton)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : copy.clipboardFailed
    if (!setResultNotice(message)) {
      showError(message)
    }
  }
})

shareReadingButton?.addEventListener('click', async () => {
  if (typeof navigator.share !== 'function') {
    if (!setResultNotice(copy.shareUnavailable)) {
      showError(copy.shareUnavailable)
    }
    return
  }

  const username = latestReading?.username ?? usernameInput.value.trim()
  if (!username || !validateUsername(username)) return

  const url = shareLinkForUsername(username)
  const text = latestReading?.shareText ?? `${copy.resultTitlePrefix} @${username}`

  try {
    await navigator.share({
      title: copy.shareTitle,
      text,
      url
    })
  } catch {
    return
  }
})

window.addEventListener('online', () => {
  updateUsernameHint()
  updateInputInteractivity()
})

window.addEventListener('offline', () => {
  updateUsernameHint()
  updateInputInteractivity()
})

window.addEventListener('keydown', (event) => {
  if (event.key !== '/') return

  const target = event.target
  const isEditableElement =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)

  if (isEditableElement) return

  event.preventDefault()
  usernameInput.focus()
  usernameInput.select()
})

window.addEventListener('beforeunload', () => {
  if (activeRequestController) {
    activeRequestController.abort()
  }
  stopLoadingTimers()
  crystal.destroy()
})
