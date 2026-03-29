import { createCrystalBallScene } from './crystal-ball-scene'
import { resolveLocaleCopy } from './oracle-experience/copy'
import { applyLocalizedCopy } from './oracle-experience/localized-ui'
import { requestReading } from './oracle-experience/network'
import { createRecentUsernamesStore } from './oracle-experience/recent-usernames'
import { copyText, renderParagraphs, setTransientButtonText } from './oracle-experience/text-utils'
import { createOracleUiState } from './oracle-experience/ui-state'
import { parseReading, validateUsername } from './oracle-experience/validation'

const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:3000'
const { locale, copy } = resolveLocaleCopy()
document.documentElement.lang = locale

const elements = {
  crystalCanvas: document.getElementById('crystal-canvas'),
  experience: document.getElementById('oracle-experience'),
  announceNode: document.getElementById('screen-announce'),
  oracleForm: document.getElementById('oracle-form'),
  usernameInput: document.getElementById('username'),
  usernameLabel: document.getElementById('username-label'),
  usernameHint: document.getElementById('username-hint'),
  usernameShortcut: document.getElementById('username-shortcut'),
  recentUsernamesDatalist: document.getElementById('recent-usernames'),
  clearRecentButton: document.getElementById('clear-recent'),
  startButton: document.getElementById('start-button'),
  homeTitle: document.getElementById('home-title'),
  homeNote: document.getElementById('home-note'),
  loadingLabel: document.getElementById('loading-label'),
  loadingStatus: document.getElementById('loading-status'),
  loadingMeta: document.getElementById('loading-meta'),
  loadingProgressBar: document.getElementById('loading-progress-bar'),
  cancelReadingButton: document.getElementById('cancel-reading'),
  errorText: document.getElementById('error-text'),
  copyErrorButton: document.getElementById('copy-error'),
  retryReadingButton: document.getElementById('retry-reading'),
  resultEyebrow: document.getElementById('result-eyebrow'),
  resultTitle: document.getElementById('result-title'),
  resultSummary: document.getElementById('result-summary'),
  resultProphecy: document.getElementById('result-prophecy'),
  resultFiveYear: document.getElementById('result-five-year'),
  resultTenYear: document.getElementById('result-ten-year'),
  resultFiveYearLabel: document.getElementById('result-five-year-label'),
  resultTenYearLabel: document.getElementById('result-ten-year-label'),
  signalGrid: document.getElementById('signal-grid'),
  goBackButton: document.getElementById('go-back'),
  copyShareButton: document.getElementById('copy-share'),
  copyLinkButton: document.getElementById('copy-link'),
  shareReadingButton: document.getElementById('share-reading'),
  resultMeta: document.getElementById('result-meta')
}

if (
  !(elements.crystalCanvas instanceof HTMLElement) ||
  !(elements.experience instanceof HTMLElement) ||
  !(elements.oracleForm instanceof HTMLFormElement) ||
  !(elements.usernameInput instanceof HTMLInputElement)
) {
  throw new Error('Oracle experience mount failed.')
}

const crystal = createCrystalBallScene(elements.crystalCanvas)
const recentUsernamesStore = createRecentUsernamesStore({ validateUsername })
const uiState = createOracleUiState({
  elements,
  copy,
  crystal,
  validateUsername,
  recentUsernamesStore,
  renderParagraphs
})

let activeRequestController = null

function buildShareLink(username) {
  const url = new URL(window.location.href)
  url.searchParams.set('username', username)
  return url.toString()
}

applyLocalizedCopy({ copy, elements })
uiState.initialize()

elements.oracleForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const username = elements.usernameInput.value.trim()
  if (!validateUsername(username)) {
    uiState.failWithError(copy.invalidUsername)
    return
  }

  if (!navigator.onLine) {
    uiState.failWithError(copy.offlineHint)
    return
  }

  activeRequestController = new AbortController()
  uiState.startLoading()

  try {
    const reading = await requestReading({
      apiBaseUrl,
      locale,
      username,
      signal: activeRequestController.signal,
      requestFailed: copy.requestFailed,
      parseReading
    })

    uiState.completeReading(reading)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      uiState.resetToIdle({ preserveInput: true, announcement: copy.loadingCancelled })
      return
    }

    uiState.failWithError(error instanceof Error ? error.message : copy.unexpectedClientError)
  } finally {
    activeRequestController = null
  }
})

elements.usernameInput.addEventListener('input', () => {
  uiState.updateInteractiveState()
})

elements.clearRecentButton?.addEventListener('click', () => {
  uiState.clearRecent()
})

elements.cancelReadingButton?.addEventListener('click', () => {
  activeRequestController?.abort()
})

elements.copyErrorButton?.addEventListener('click', async () => {
  const latestError = uiState.getLatestError()
  if (!latestError) return

  try {
    await copyText(latestError, copy.clipboardFailed)
    if (elements.copyErrorButton instanceof HTMLButtonElement) {
      setTransientButtonText(elements.copyErrorButton, copy.copied, copy.errorCopyButton)
    }
  } catch (error) {
    uiState.failWithError(error instanceof Error ? error.message : copy.clipboardFailed)
  }
})

elements.retryReadingButton?.addEventListener('click', () => {
  uiState.resetToIdle({ preserveInput: true })
})

elements.goBackButton?.addEventListener('click', () => {
  uiState.resetToIdle({ preserveInput: true })
})

elements.copyShareButton?.addEventListener('click', async () => {
  const latestReading = uiState.getLatestReading()
  if (!latestReading) return

  try {
    await copyText(latestReading.shareText, copy.clipboardFailed)
    if (elements.copyShareButton instanceof HTMLButtonElement) {
      setTransientButtonText(elements.copyShareButton, copy.copied, copy.copyShareButton)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : copy.clipboardFailed
    if (!uiState.setResultNotice(message)) uiState.failWithError(message)
  }
})

elements.copyLinkButton?.addEventListener('click', async () => {
  const latestReading = uiState.getLatestReading()
  const username = latestReading?.username ?? elements.usernameInput.value.trim()
  if (!validateUsername(username)) return

  try {
    await copyText(buildShareLink(username), copy.clipboardFailed)
    if (elements.copyLinkButton instanceof HTMLButtonElement) {
      setTransientButtonText(elements.copyLinkButton, copy.copied, copy.copyLinkButton)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : copy.clipboardFailed
    if (!uiState.setResultNotice(message)) uiState.failWithError(message)
  }
})

elements.shareReadingButton?.addEventListener('click', async () => {
  if (typeof navigator.share !== 'function') {
    if (!uiState.setResultNotice(copy.shareUnavailable)) {
      uiState.failWithError(copy.shareUnavailable)
    }
    return
  }

  const latestReading = uiState.getLatestReading()
  const username = latestReading?.username ?? elements.usernameInput.value.trim()
  if (!validateUsername(username)) return

  try {
    await navigator.share({
      title: copy.shareTitle,
      text: latestReading?.shareText ?? `${copy.resultTitlePrefix} @${username}`,
      url: buildShareLink(username)
    })
  } catch {
    return
  }
})

window.addEventListener('online', () => {
  uiState.updateInteractiveState()
})

window.addEventListener('offline', () => {
  uiState.updateInteractiveState()
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
  elements.usernameInput.focus()
  elements.usernameInput.select()
})

window.addEventListener('beforeunload', () => {
  activeRequestController?.abort()
  uiState.destroy()
})
