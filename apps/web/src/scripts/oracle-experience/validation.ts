/**
 * Purpose: Keep username and payload validation logic centralized for the oracle flow.
 * Interface: validateUsername(), parseReading() helpers for runtime-safe behavior.
 * Invariants: accepted usernames always match GitHub format constraints.
 * Decisions: keep validation explicit and local to avoid schema package overhead in the client bundle.
 */

import type { OracleReading, RequestFailed } from './types'

const githubUsernamePattern = /^[A-Za-z0-9](?:[A-Za-z0-9]|-){0,37}$/

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function parseSignals(payload: unknown): OracleReading['signals'] | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload as Record<string, unknown>
  if (
    typeof candidate.followers !== 'number' ||
    typeof candidate.publicRepos !== 'number' ||
    !isStringArray(candidate.topLanguages) ||
    !isStringArray(candidate.recentRepoNames)
  ) {
    return null
  }

  return {
    followers: candidate.followers,
    publicRepos: candidate.publicRepos,
    topLanguages: candidate.topLanguages,
    recentRepoNames: candidate.recentRepoNames
  }
}

export function validateUsername(username: string): boolean {
  return githubUsernamePattern.test(username)
}

export function parseReading(payload: unknown, requestFailed: RequestFailed): OracleReading {
  if (!payload || typeof payload !== 'object') {
    throw new Error(requestFailed(500))
  }

  const candidate = payload as Record<string, unknown>
  const signals = parseSignals(candidate.signals)

  if (
    typeof candidate.username !== 'string' ||
    typeof candidate.summary !== 'string' ||
    typeof candidate.prophecy !== 'string' ||
    typeof candidate.fiveYearOutlook !== 'string' ||
    typeof candidate.tenYearOutlook !== 'string' ||
    typeof candidate.shareText !== 'string' ||
    !signals
  ) {
    throw new Error(requestFailed(500))
  }

  return {
    username: candidate.username,
    summary: candidate.summary,
    prophecy: candidate.prophecy,
    fiveYearOutlook: candidate.fiveYearOutlook,
    tenYearOutlook: candidate.tenYearOutlook,
    shareText: candidate.shareText,
    signals
  }
}
