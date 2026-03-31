/**
 * Purpose: Define shared TypeScript contracts for oracle experience modules.
 * Interface: Exports locale/copy, DOM element, API payload, and UI state types.
 * Invariants: Runtime modules share one stable contract surface for safer refactors.
 * Decisions: Keep client-local types lightweight and independent from runtime schema libraries.
 */

export type OracleLocale = 'en' | 'es'

export type OracleCopy = {
  title: string
  introEnterAria: string
  introInstruction: string
  usernameLabel: string
  startButton: string
  startButtonAria: string
  note: string
  usernameHintIdle: string
  usernameHintValid: string
  usernameHintInvalid: string
  shortcutHintPrefix: string
  shortcutHintSuffix: string
  clearRecent: string
  recentUsernamesTitle: string
  recentCleared: string
  loadingLabel: string
  loadingStatusA: string
  loadingStatusB: string
  loadingStatusC: string
  loadingMeta: (step: number, total: number, elapsedSeconds: number) => string
  cancelButton: string
  loadingCancelled: string
  errorCopyButton: string
  retryButton: string
  resultEyebrow: string
  resultTitlePrefix: string
  fiveYearLabel: string
  tenYearLabel: string
  goBack: string
  shareImageButton: string
  shareXButton: string
  shareImageProcessing: string
  copied: string
  resultMeta: (elapsedSeconds: number) => string
  followers: string
  publicRepos: string
  topLanguages: string
  recentRepos: string
  unknown: string
  invalidUsername: string
  requestFailed: (status: number) => string
  clipboardFailed: string
  unexpectedClientError: string
  offlineHint: string
  shareTitle: string
  shareImageDownloaded: string
  shareImageFailed: string
  sharePopupBlocked: string
  announceLoading: string
  announceResult: string
  announceError: string
  announceIdle: string
  footerCopyright: string
  footerLicenseLink: string
  footerAbout: string
  footerVisitPrefix: string
}

export type OracleSignals = {
  followers: number
  publicRepos: number
  topLanguages: string[]
  recentRepoNames: string[]
}

export type OracleReading = {
  username: string
  summary: string
  prophecy: string
  fiveYearOutlook: string
  tenYearOutlook: string
  shareText: string
  signals: OracleSignals
}

export type RequestFailed = (status: number) => string
export type ValidateUsername = (username: string) => boolean
export type ParseReading = (payload: unknown, requestFailed: RequestFailed) => OracleReading
export type RenderParagraphs = (text: string) => string

export type CrystalController = {
  setZoomTarget: (value: number, immediate?: boolean) => void
  setActivityTarget: (value: number, immediate?: boolean) => void
  destroy: () => void
}

export type OracleElements = {
  introTitle: HTMLElement | null
  introEnterButton: HTMLElement | null
  introInstruction: HTMLElement | null
  introSmokeCanvas: HTMLElement | null
  crystalCanvas: HTMLElement
  experience: HTMLElement
  announceNode: HTMLElement | null
  oracleForm: HTMLFormElement
  usernameInput: HTMLInputElement
  usernameLabel: HTMLElement | null
  usernameHint: HTMLElement | null
  usernameShortcut: HTMLElement | null
  recentUsernamesDatalist: HTMLElement | null
  recentUsernamesPanel: HTMLElement | null
  recentUsernamesTitle: HTMLElement | null
  recentUsernamesList: HTMLElement | null
  clearRecentButton: HTMLElement | null
  startButton: HTMLElement | null
  homeTitle: HTMLElement | null
  homeNote: HTMLElement | null
  loadingLabel: HTMLElement | null
  loadingStatus: HTMLElement | null
  loadingMeta: HTMLElement | null
  loadingProgressBar: HTMLElement | null
  cancelReadingButton: HTMLElement | null
  errorText: HTMLElement | null
  copyErrorButton: HTMLElement | null
  retryReadingButton: HTMLElement | null
  resultEyebrow: HTMLElement | null
  resultTitle: HTMLElement | null
  resultSummary: HTMLElement | null
  resultProphecy: HTMLElement | null
  resultFiveYear: HTMLElement | null
  resultTenYear: HTMLElement | null
  resultFiveYearLabel: HTMLElement | null
  resultTenYearLabel: HTMLElement | null
  signalGrid: HTMLElement | null
  resultCapture: HTMLElement | null
  goBackButton: HTMLElement | null
  shareImageButton: HTMLElement | null
  shareXButton: HTMLElement | null
  resultMeta: HTMLElement | null
  footerCopyright: HTMLElement | null
  footerLicenseLink: HTMLElement | null
  footerAbout: HTMLElement | null
  footerVisitPrefix: HTMLElement | null
}

export type RecentUsernamesStore = {
  read: () => string[]
  remember: (currentUsernames: string[], username: string) => string[]
  clear: () => string[]
}

export type OracleUiState = {
  initialize: () => void
  updateInteractiveState: () => void
  startLoading: () => void
  completeReading: (reading: OracleReading) => void
  failWithError: (message: string) => void
  resetToIdle: (options?: { preserveInput?: boolean; announcement?: string }) => void
  clearRecent: () => void
  setResultNotice: (message: string) => boolean
  getLatestError: () => string
  getLatestReading: () => OracleReading | null
  destroy: () => void
}

export type OracleState = 'intro' | 'idle' | 'loading' | 'result' | 'error'
