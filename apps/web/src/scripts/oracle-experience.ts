import { createCrystalBallScene } from './crystal-ball-scene'
import { toBlob } from 'html-to-image'
import { resolveLocaleCopy } from './oracle-experience/copy'
import { applyLocalizedCopy } from './oracle-experience/localized-ui'
import { requestReading } from './oracle-experience/network'
import { createRecentUsernamesStore } from './oracle-experience/recent-usernames'
import { copyText, renderParagraphs, setTransientButtonText } from './oracle-experience/text-utils'
import { createOracleUiState } from './oracle-experience/ui-state'
import { parseReading, validateUsername } from './oracle-experience/validation'
import type { OracleElements } from './oracle-experience/types'

const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:3000'
const { locale, copy } = resolveLocaleCopy()
document.documentElement.lang = locale

const candidateElements = {
  crystalCanvas: document.getElementById('crystal-canvas'),
  experience: document.getElementById('oracle-experience'),
  announceNode: document.getElementById('screen-announce'),
  oracleForm: document.getElementById('oracle-form'),
  usernameInput: document.getElementById('username'),
  usernameLabel: document.getElementById('username-label'),
  usernameHint: document.getElementById('username-hint'),
  usernameShortcut: document.getElementById('username-shortcut'),
  recentUsernamesDatalist: document.getElementById('recent-usernames'),
  recentUsernamesPanel: document.getElementById('recent-usernames-panel'),
  recentUsernamesTitle: document.getElementById('recent-usernames-title'),
  recentUsernamesList: document.getElementById('recent-usernames-list'),
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
  resultCapture: document.querySelector('#result-panel .result-scroll'),
  goBackButton: document.getElementById('go-back'),
  shareImageButton: document.getElementById('share-image'),
  shareXButton: document.getElementById('share-x'),
  resultMeta: document.getElementById('result-meta')
}

if (
  !(candidateElements.crystalCanvas instanceof HTMLElement) ||
  !(candidateElements.experience instanceof HTMLElement) ||
  !(candidateElements.oracleForm instanceof HTMLFormElement) ||
  !(candidateElements.usernameInput instanceof HTMLInputElement)
) {
  throw new Error('Oracle experience mount failed.')
}

const elements: OracleElements = {
  ...candidateElements,
  crystalCanvas: candidateElements.crystalCanvas,
  experience: candidateElements.experience,
  oracleForm: candidateElements.oracleForm,
  usernameInput: candidateElements.usernameInput
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

let activeRequestController: AbortController | null = null

function buildShareLink(username: string): string {
  const url = new URL('/', window.location.origin)
  url.searchParams.set('username', username)
  return url.toString()
}

function buildXShareLink({ shareUrl, shareText }: { shareUrl: string; shareText: string }): string {
  const xIntentUrl = new URL('https://twitter.com/intent/tweet')
  xIntentUrl.searchParams.set('url', shareUrl)
  xIntentUrl.searchParams.set('text', shareText)
  return xIntentUrl.toString()
}

function openShareWindow(url: string): boolean {
  const popupWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (!popupWindow) return false

  popupWindow.opener = null
  return true
}

async function captureReadingImage(captureNode: HTMLElement): Promise<Blob> {
  captureNode.classList.add('capture-export-mode')
  const captureWidth = Math.max(1, Math.round(captureNode.scrollWidth))
  const captureHeight = Math.max(1, Math.round(captureNode.scrollHeight))

  try {
    const blob = await toBlob(captureNode, {
      cacheBust: true,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: captureWidth,
      height: captureHeight,
      style: {
        width: `${captureWidth}px`,
        height: `${captureHeight}px`,
        backgroundColor: 'rgb(6 10 25)',
        maxHeight: 'none',
        overflow: 'visible'
      }
    })

    if (blob) return blob
  } finally {
    captureNode.classList.remove('capture-export-mode')
  }

  throw new Error(copy.shareImageFailed)
}

function resolveShareContext() {
  const latestReading = uiState.getLatestReading()
  const username = latestReading?.username ?? elements.usernameInput.value.trim()
  if (!validateUsername(username)) return null

  return {
    username,
    shareUrl: buildShareLink(username),
    shareText: latestReading?.shareText ?? `${copy.resultTitlePrefix} @${username}`
  }
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

elements.shareImageButton?.addEventListener('click', async () => {
  const shareContext = resolveShareContext()
  if (!shareContext || !(elements.resultCapture instanceof HTMLElement)) return

  const shareImageButton =
    elements.shareImageButton instanceof HTMLButtonElement ? elements.shareImageButton : null
  const previousLabel = shareImageButton?.textContent ?? copy.shareImageButton

  if (shareImageButton) {
    shareImageButton.disabled = true
    shareImageButton.textContent = copy.shareImageProcessing
  }

  try {
    const imageBlob = await captureReadingImage(elements.resultCapture)
    const imageFile = new File([imageBlob], `verokodo-${shareContext.username}-reading.png`, {
      type: 'image/png'
    })

    if (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [imageFile] })
    ) {
      await navigator.share({
        files: [imageFile]
      })
      return
    }

    const imageDownloadUrl = URL.createObjectURL(imageBlob)
    const downloadLink = document.createElement('a')
    downloadLink.href = imageDownloadUrl
    downloadLink.download = imageFile.name
    downloadLink.click()
    window.setTimeout(() => URL.revokeObjectURL(imageDownloadUrl), 0)

    if (!uiState.setResultNotice(copy.shareImageDownloaded)) {
      uiState.failWithError(copy.shareImageDownloaded)
    }
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError')) {
      return
    }

    const message = error instanceof Error ? error.message : copy.shareImageFailed
    if (!uiState.setResultNotice(message)) uiState.failWithError(message)
  } finally {
    if (shareImageButton) {
      shareImageButton.disabled = false
      shareImageButton.textContent = previousLabel
    }
  }
})

elements.shareXButton?.addEventListener('click', () => {
  const shareContext = resolveShareContext()
  if (!shareContext) return

  const xShareLink = buildXShareLink({
    shareUrl: shareContext.shareUrl,
    shareText: shareContext.shareText
  })

  if (openShareWindow(xShareLink)) return
  if (!uiState.setResultNotice(copy.sharePopupBlocked)) uiState.failWithError(copy.sharePopupBlocked)
})

window.addEventListener('online', () => {
  uiState.updateInteractiveState()
})

window.addEventListener('offline', () => {
  uiState.updateInteractiveState()
})

window.addEventListener('keydown', (event) => {
  const isSlashKey = event.key === '/' || event.code === 'Slash' || event.code === 'NumpadDivide'
  if (!isSlashKey) return
  if (event.ctrlKey || event.metaKey || event.altKey) return

  const target = event.target
  const isEditableElement =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)

  if (isEditableElement) return

  event.preventDefault()
  elements.usernameInput.focus()
  elements.usernameInput.select()
}, { capture: true })

window.addEventListener('beforeunload', () => {
  activeRequestController?.abort()
  uiState.destroy()
})
