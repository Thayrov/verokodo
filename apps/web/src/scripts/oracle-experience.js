import { createCrystalBallScene } from './crystal-ball-scene'

const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:3000'

const messages = {
  en: {
    title: 'Verokodo',
    lead: 'Get a sharp profile reading with practical next steps.',
    usernameLabel: 'GitHub Username',
    startButton: '→',
    startButtonAria: 'Start reading',
    note: 'Use your GitHub username to get a glimpse of your dev future.',
    loadingLabel: 'Reading in progress',
    loadingStatusA: 'Collecting profile signals...',
    loadingStatusB: 'Mapping coding patterns...',
    loadingStatusC: 'Writing final reading...',
    errorCopyButton: 'Copy Error',
    retryButton: 'Try Again',
    resultEyebrow: 'Reading complete',
    resultTitlePrefix: 'Reading for',
    fiveYearLabel: '5-year outlook',
    tenYearLabel: '10-year outlook',
    goBack: 'Go back',
    copied: 'Copied',
    followers: 'Followers',
    publicRepos: 'Public repos',
    topLanguages: 'Top languages',
    recentRepos: 'Recent repos',
    unknown: 'Unknown',
    invalidUsername: 'Invalid GitHub username.',
    requestFailed: (status) => `Request failed (HTTP ${status}).`,
    unexpectedClientError: 'Unexpected client error.'
  },
  es: {
    title: 'Verokodo',
    lead: 'Recibe una lectura de perfil clara, directa y accionable.',
    usernameLabel: 'Usuario de GitHub',
    startButton: '→',
    startButtonAria: 'Iniciar lectura',
    note: 'Usa tu usuario de GitHub para ver un vistazo de tu futuro dev.',
    loadingLabel: 'Lectura en progreso',
    loadingStatusA: 'Recolectando senales del perfil...',
    loadingStatusB: 'Mapeando patrones de codigo...',
    loadingStatusC: 'Escribiendo lectura final...',
    errorCopyButton: 'Copiar error',
    retryButton: 'Reintentar',
    resultEyebrow: 'Lectura lista',
    resultTitlePrefix: 'Lectura de',
    fiveYearLabel: 'Proyeccion a 5 anos',
    tenYearLabel: 'Proyeccion a 10 anos',
    goBack: 'Volver',
    copied: 'Copiado',
    followers: 'Seguidores',
    publicRepos: 'Repos publicos',
    topLanguages: 'Lenguajes principales',
    recentRepos: 'Repos recientes',
    unknown: 'Desconocido',
    invalidUsername: 'Usuario de GitHub invalido.',
    requestFailed: (status) => `El request fallo (HTTP ${status}).`,
    unexpectedClientError: 'Error inesperado en cliente.'
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
const oracleForm = document.getElementById('oracle-form')
const usernameInput = document.getElementById('username')
const loadingLabel = document.getElementById('loading-label')
const loadingStatus = document.getElementById('loading-status')
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

if (!(crystalCanvas instanceof HTMLElement) || !(experience instanceof HTMLElement)) {
  throw new Error('Crystal canvas mount failed.')
}

const crystal = createCrystalBallScene(crystalCanvas)
crystal.setZoomTarget(0.08)

let latestError = ''

const badge = document.getElementById('home-badge')
const homeTitle = document.getElementById('home-title')
const homeLead = document.getElementById('home-lead')
const usernameLabel = document.getElementById('username-label')
const startButton = document.getElementById('start-button')
const homeNote = document.getElementById('home-note')

if (badge) badge.textContent = copy.badge
if (homeTitle) homeTitle.textContent = copy.title
if (homeLead) homeLead.textContent = copy.lead
if (usernameLabel) usernameLabel.textContent = copy.usernameLabel
if (startButton) {
  startButton.textContent = copy.startButton
  startButton.setAttribute('aria-label', copy.startButtonAria)
}
if (homeNote) homeNote.textContent = copy.note
if (loadingLabel) loadingLabel.textContent = copy.loadingLabel
if (loadingStatus) loadingStatus.textContent = copy.loadingStatusA
if (copyErrorButton) copyErrorButton.textContent = copy.errorCopyButton
if (retryReadingButton) retryReadingButton.textContent = copy.retryButton
if (resultEyebrow) resultEyebrow.textContent = copy.resultEyebrow
if (resultFiveYearLabel) resultFiveYearLabel.textContent = copy.fiveYearLabel
if (resultTenYearLabel) resultTenYearLabel.textContent = copy.tenYearLabel
if (goBackButton) goBackButton.textContent = copy.goBack

function setState(nextState) {
  experience.dataset.state = nextState
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
    typeof candidate.signals !== 'object'
  ) {
    throw new Error(copy.requestFailed(500))
  }

  return candidate
}

function showError(message) {
  latestError = message
  if (errorText) errorText.textContent = message
  setState('error')
  crystal.setZoomTarget(0.38)
}

function resetToIdle() {
  latestError = ''
  if (resultSummary) resultSummary.textContent = ''
  if (resultProphecy) resultProphecy.innerHTML = ''
  if (resultFiveYear) resultFiveYear.textContent = ''
  if (resultTenYear) resultTenYear.textContent = ''
  if (signalGrid) signalGrid.innerHTML = ''
  if (loadingStatus) loadingStatus.textContent = copy.loadingStatusA
  setState('idle')
  crystal.setZoomTarget(0.08)
  if (usernameInput instanceof HTMLInputElement) {
    usernameInput.focus()
  }
}

oracleForm?.addEventListener('submit', async (event) => {
  event.preventDefault()

  const username = usernameInput instanceof HTMLInputElement ? usernameInput.value.trim() : ''
  const validUsername = /^[A-Za-z0-9](?:[A-Za-z0-9]|-){0,37}$/

  if (!validUsername.test(username)) {
    showError(copy.invalidUsername)
    return
  }

  setState('loading')
  crystal.setZoomTarget(1.02)
  if (loadingStatus) loadingStatus.textContent = copy.loadingStatusA

  setTimeout(() => {
    if (experience.dataset.state === 'loading' && loadingStatus) {
      loadingStatus.textContent = copy.loadingStatusB
    }
  }, 850)

  try {
    const response = await fetch(`${apiBaseUrl}/oracle`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ provider: 'github', username, locale })
    })

    if (!response.ok) {
      throw new Error(await readApiError(response))
    }

    const reading = parseReading(await response.json())

    if (loadingStatus) loadingStatus.textContent = copy.loadingStatusC
    if (resultTitle) resultTitle.textContent = `${copy.resultTitlePrefix} @${reading.username}`
    if (resultSummary) resultSummary.textContent = reading.summary
    if (resultProphecy) resultProphecy.innerHTML = renderParagraphs(reading.prophecy)
    if (resultFiveYear) resultFiveYear.textContent = reading.fiveYearOutlook
    if (resultTenYear) resultTenYear.textContent = reading.tenYearOutlook

    if (signalGrid) signalGrid.innerHTML = ''
    mountSignal(copy.followers, String(reading.signals.followers))
    mountSignal(copy.publicRepos, String(reading.signals.publicRepos))
    mountSignal(copy.topLanguages, reading.signals.topLanguages.join(', ') || copy.unknown)
    mountSignal(copy.recentRepos, reading.signals.recentRepoNames.join(', ') || copy.unknown)

    setTimeout(() => {
      crystal.setZoomTarget(0.18)
      setState('result')
    }, 380)
  } catch (error) {
    const message = error instanceof Error ? error.message : copy.unexpectedClientError
    showError(message)
  }
})

copyErrorButton?.addEventListener('click', async () => {
  if (!latestError) return
  await navigator.clipboard.writeText(latestError)
  if (copyErrorButton instanceof HTMLButtonElement) {
    copyErrorButton.textContent = copy.copied
    setTimeout(() => {
      copyErrorButton.textContent = copy.errorCopyButton
    }, 1200)
  }
})

retryReadingButton?.addEventListener('click', () => {
  setState('idle')
  crystal.setZoomTarget(0.08)
})

goBackButton?.addEventListener('click', () => {
  resetToIdle()
})

window.addEventListener('beforeunload', () => {
  crystal.destroy()
})
