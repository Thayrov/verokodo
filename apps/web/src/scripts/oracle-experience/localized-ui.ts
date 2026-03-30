/**
 * Purpose: Apply locale copy to static and semi-static nodes in the oracle page.
 * Interface: applyLocalizedCopy({ copy, elements }).
 * Invariants: only present nodes are updated; missing optional nodes do not fail the flow.
 * Decisions: shortcut hint uses explicit DOM nodes to avoid untrusted HTML insertion.
 */

import type { OracleCopy, OracleElements } from './types'

export function applyLocalizedCopy({ copy, elements }: { copy: OracleCopy; elements: OracleElements }): void {
  if (elements.homeTitle instanceof HTMLElement) elements.homeTitle.textContent = copy.title
  if (elements.usernameLabel instanceof HTMLElement) elements.usernameLabel.textContent = copy.usernameLabel

  if (elements.startButton instanceof HTMLButtonElement) {
    elements.startButton.textContent = copy.startButton
    elements.startButton.setAttribute('aria-label', copy.startButtonAria)
  }

  if (elements.homeNote instanceof HTMLElement) elements.homeNote.textContent = copy.note
  if (elements.usernameHint instanceof HTMLElement) elements.usernameHint.textContent = copy.usernameHintIdle

  if (elements.usernameShortcut instanceof HTMLElement) {
    elements.usernameShortcut.textContent = ''
    elements.usernameShortcut.append(copy.shortcutHintPrefix)

    const keyNode = document.createElement('kbd')
    keyNode.textContent = '/'
    elements.usernameShortcut.append(keyNode)
    elements.usernameShortcut.append(copy.shortcutHintSuffix)
  }

  if (elements.clearRecentButton instanceof HTMLButtonElement) {
    elements.clearRecentButton.textContent = copy.clearRecent
  }

  if (elements.recentUsernamesTitle instanceof HTMLElement) {
    elements.recentUsernamesTitle.textContent = copy.recentUsernamesTitle
  }

  if (elements.loadingLabel instanceof HTMLElement) elements.loadingLabel.textContent = copy.loadingLabel
  if (elements.loadingStatus instanceof HTMLElement) elements.loadingStatus.textContent = copy.loadingStatusA
  if (elements.loadingMeta instanceof HTMLElement) elements.loadingMeta.textContent = copy.loadingMeta(1, 3, 0)

  if (elements.cancelReadingButton instanceof HTMLButtonElement) {
    elements.cancelReadingButton.textContent = copy.cancelButton
  }

  if (elements.copyErrorButton instanceof HTMLButtonElement) {
    elements.copyErrorButton.textContent = copy.errorCopyButton
  }

  if (elements.retryReadingButton instanceof HTMLButtonElement) {
    elements.retryReadingButton.textContent = copy.retryButton
  }

  if (elements.resultEyebrow instanceof HTMLElement) elements.resultEyebrow.textContent = copy.resultEyebrow
  if (elements.resultFiveYearLabel instanceof HTMLElement) elements.resultFiveYearLabel.textContent = copy.fiveYearLabel
  if (elements.resultTenYearLabel instanceof HTMLElement) elements.resultTenYearLabel.textContent = copy.tenYearLabel

  if (elements.goBackButton instanceof HTMLButtonElement) {
    elements.goBackButton.textContent = copy.goBack
  }

  if (elements.copyShareButton instanceof HTMLButtonElement) {
    elements.copyShareButton.textContent = copy.copyShareButton
  }

  if (elements.copyLinkButton instanceof HTMLButtonElement) {
    elements.copyLinkButton.textContent = copy.copyLinkButton
  }

  if (elements.shareReadingButton instanceof HTMLButtonElement) {
    elements.shareReadingButton.textContent = copy.shareButton
    elements.shareReadingButton.disabled = typeof navigator.share !== 'function'
  }
}
