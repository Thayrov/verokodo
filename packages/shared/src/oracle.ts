/**
 * Purpose: Define and validate the request/response contract for oracle readings.
 * Interface: request/response schemas, parser helpers, reading encode/decode helpers.
 * Invariants: provider is GitHub in Tier 1, usernames are normalized, payload shape is stable.
 * Decisions: Keep contract strict and runtime-validated with zod to prevent app drift.
 */

import { z } from 'zod'

const githubUsernamePattern = /^[a-z\d](?:[a-z\d-]{0,37})$/i

export const oracleProviderSchema = z.enum(['github'])
export const oracleLocaleSchema = z.enum(['en', 'es'])

export const oracleRequestSchema = z.object({
  provider: oracleProviderSchema,
  username: z.string().trim().min(1).max(39).regex(githubUsernamePattern),
  locale: oracleLocaleSchema.default('en')
})

export const oracleSignalsSchema = z.object({
  profileName: z.string().trim().min(1).max(120).nullable(),
  followers: z.number().int().nonnegative(),
  publicRepos: z.number().int().nonnegative(),
  topLanguages: z.array(z.string().trim().min(1)).max(8),
  recentRepoNames: z.array(z.string().trim().min(1)).max(8),
  readmeExcerpt: z.string().trim().min(1).max(500).nullable()
})

export const oracleResponseSchema = z.object({
  provider: oracleProviderSchema,
  username: z.string().trim().min(1).max(39),
  locale: oracleLocaleSchema,
  generatedAt: z.string().datetime({ offset: true }),
  summary: z.string().trim().min(30).max(240),
  prophecy: z.string().trim().min(120).max(900),
  shareText: z.string().trim().min(30).max(280),
  signals: oracleSignalsSchema
})

export type OracleProvider = z.infer<typeof oracleProviderSchema>
export type OracleLocale = z.infer<typeof oracleLocaleSchema>
export type OracleRequest = z.infer<typeof oracleRequestSchema>
export type OracleSignals = z.infer<typeof oracleSignalsSchema>
export type OracleResponse = z.infer<typeof oracleResponseSchema>

export function parseOracleRequest(input: unknown): OracleRequest {
  return oracleRequestSchema.parse(input)
}

export function parseOracleResponse(input: unknown): OracleResponse {
  return oracleResponseSchema.parse(input)
}

export function encodeReading(reading: OracleResponse): string {
  return encodeURIComponent(JSON.stringify(reading))
}

export function decodeReading(serialized: string): OracleResponse {
  const parsed = JSON.parse(decodeURIComponent(serialized))
  return parseOracleResponse(parsed)
}
