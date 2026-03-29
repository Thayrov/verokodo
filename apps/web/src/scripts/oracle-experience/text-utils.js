/**
 * Purpose: Provide safe text rendering and clipboard helpers for the oracle UI.
 * Interface: renderParagraphs(), copyText(), setTransientButtonText().
 * Invariants: rendered paragraph HTML is escaped before insertion into the DOM.
 * Decisions: includes legacy clipboard fallback for browsers without navigator.clipboard.
 */

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function renderParagraphs(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')
}

export async function copyText(value, clipboardFailed) {
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
    throw new Error(clipboardFailed)
  }
}

export function setTransientButtonText(button, nextLabel, restoreLabel) {
  button.textContent = nextLabel
  window.setTimeout(() => {
    button.textContent = restoreLabel
  }, 1300)
}
