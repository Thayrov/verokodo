/**
 * Purpose: Isolate oracle API request flow and error message extraction.
 * Interface: requestReading({ apiBaseUrl, locale, username, signal, requestFailed, parseReading }).
 * Invariants: non-OK responses always throw readable errors with HTTP context.
 * Decisions: caller provides parsing strategy so this module stays transport-focused.
 */

import type { OracleLocale, OracleReading, ParseReading, RequestFailed } from './types'

async function readApiError(response: Response, requestFailed: RequestFailed): Promise<string> {
  const fallback = requestFailed(response.status)

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

export async function requestReading({
  apiBaseUrl,
  locale,
  username,
  signal,
  requestFailed,
  parseReading
}: {
  apiBaseUrl: string
  locale: OracleLocale
  username: string
  signal: AbortSignal
  requestFailed: RequestFailed
  parseReading: ParseReading
}): Promise<OracleReading> {
  const response = await fetch(`${apiBaseUrl}/oracle`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    signal,
    body: JSON.stringify({ provider: 'github', username, locale })
  })

  if (!response.ok) {
    throw new Error(await readApiError(response, requestFailed))
  }

  return parseReading(await response.json(), requestFailed)
}
