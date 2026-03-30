/**
 * Purpose: Encapsulate rendering and clearing result/error content in the oracle panels.
 * Interface: createResultRenderer(...) returns clear/render/setNotice helpers.
 * Invariants: result content fields are updated together from the same reading payload.
 * Decisions: isolate DOM rendering so the state machine module focuses on transitions.
 */

import type { OracleCopy, OracleElements, OracleReading, RenderParagraphs } from '../types'

type ResultRenderer = {
  clear: () => void
  render: (reading: OracleReading, elapsedSeconds: number) => void
  setNotice: (message: string) => boolean
  setError: (message: string) => void
}

export function createResultRenderer({
  elements,
  copy,
  renderParagraphs
}: {
  elements: OracleElements
  copy: OracleCopy
  renderParagraphs: RenderParagraphs
}): ResultRenderer {
  function mountSignal(label: string, value: string): void {
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

  return {
    clear() {
      if (elements.errorText instanceof HTMLElement) elements.errorText.textContent = ''
      if (elements.resultSummary instanceof HTMLElement) elements.resultSummary.textContent = ''
      if (elements.resultProphecy instanceof HTMLElement) elements.resultProphecy.innerHTML = ''
      if (elements.resultFiveYear instanceof HTMLElement) elements.resultFiveYear.textContent = ''
      if (elements.resultTenYear instanceof HTMLElement) elements.resultTenYear.textContent = ''
      if (elements.signalGrid instanceof HTMLElement) elements.signalGrid.innerHTML = ''
      if (elements.resultMeta instanceof HTMLElement) elements.resultMeta.textContent = ''
    },
    render(reading: OracleReading, elapsedSeconds: number) {
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
    },
    setNotice(message: string): boolean {
      if (elements.experience.dataset.state !== 'result' || !(elements.resultMeta instanceof HTMLElement)) {
        return false
      }

      elements.resultMeta.textContent = message
      return true
    },
    setError(message: string): void {
      if (elements.errorText instanceof HTMLElement) {
        elements.errorText.textContent = message
      }
    }
  }
}
