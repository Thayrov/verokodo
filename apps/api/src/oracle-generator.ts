/**
 * Purpose: Generate a narrative oracle reading from normalized public profile signals.
 * Interface: generateOracleReading(request, signals) -> validated oracle response.
 * Invariants: output always conforms to shared schema; no private data is referenced.
 * Decisions: use structured generation to keep response shape deterministic.
 */

import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'

import { parseOracleResponse } from '@verokodo/shared'
import type { OracleRequest, OracleResponse, OracleSignals } from '@verokodo/shared'

const oracleDraftSchema = z.object({
  summary: z.string().trim().min(30).max(240),
  prophecy: z.string().trim().min(120).max(900),
  shareText: z.string().trim().min(30).max(280)
})

function buildPrompt(request: OracleRequest, signals: OracleSignals): string {
  const profileName = signals.profileName ?? request.username
  const languageLine = signals.topLanguages.length > 0 ? signals.topLanguages.join(', ') : 'Unknown'
  const recentRepos = signals.recentRepoNames.length > 0 ? signals.recentRepoNames.join(', ') : 'Unknown'
  const readme = signals.readmeExcerpt ?? 'No profile README found.'
  const outputLanguage = request.locale === 'es' ? 'Spanish' : 'English'

  return [
    'You are Verokodo, a practical profile reader for developers.',
    'Use only the provided public signals. Never invent facts.',
    `Write all fields in ${outputLanguage}.`,
    'Voice guide:',
    '- conversational but technical',
    '- direct and transparent',
    '- short, scannable lines',
    '- action-oriented and specific',
    '- immersive but not mystical or vague',
    'Output fields:',
    '- summary: 1-2 short sentences.',
    '- prophecy: 2-3 short paragraphs with actionable direction.',
    '- shareText: one punchy line for social sharing.',
    '',
    'Public profile signals:',
    `- Provider: ${request.provider}`,
    `- Username: ${request.username}`,
    `- Display name: ${profileName}`,
    `- Followers: ${signals.followers}`,
    `- Public repos: ${signals.publicRepos}`,
    `- Top languages: ${languageLine}`,
    `- Recently pushed repos: ${recentRepos}`,
    `- README excerpt: ${readme}`
  ].join('\n')
}

export async function generateOracleReading(
  request: OracleRequest,
  signals: OracleSignals
): Promise<OracleResponse> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const missingKeyMessage =
      request.locale === 'es'
        ? 'Falta GOOGLE_GENERATIVE_AI_API_KEY en la configuracion del servidor.'
        : 'Server missing GOOGLE_GENERATIVE_AI_API_KEY.'

    throw new HTTPException(500, {
      message: missingKeyMessage
    })
  }

  const modelName = process.env.VEROKODO_MODEL ?? 'gemini-3.1-flash-lite-preview'

  const { object } = await generateObject({
    model: google(modelName),
    schema: oracleDraftSchema,
    prompt: buildPrompt(request, signals)
  })

  return parseOracleResponse({
    provider: request.provider,
    username: request.username,
    locale: request.locale,
    generatedAt: new Date().toISOString(),
    summary: object.summary,
    prophecy: object.prophecy,
    shareText: object.shareText,
    signals
  })
}
