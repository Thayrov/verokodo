/**
 * Purpose: Keep username and payload validation logic centralized for the oracle flow.
 * Interface: validateUsername(), parseReading() helpers for runtime-safe behavior.
 * Invariants: accepted usernames always match GitHub format constraints.
 * Decisions: keep validation explicit and local to avoid schema package overhead in the client bundle.
 */

const githubUsernamePattern = /^[A-Za-z0-9](?:[A-Za-z0-9]|-){0,37}$/

export function validateUsername(username) {
  return githubUsernamePattern.test(username)
}

export function parseReading(payload, requestFailed) {
  if (!payload || typeof payload !== 'object') {
    throw new Error(requestFailed(500))
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
    throw new Error(requestFailed(500))
  }

  return candidate
}
