import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { rateLimiter } from 'hono-rate-limiter'
import { ZodError } from 'zod'

import { parseOracleRequest } from '@verokodo/shared'

import { fetchGitHubSignals } from './github-signals'
import { generateOracleReading } from './oracle-generator'

const app = new Hono()

function parsePositiveInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) return fallback
  const parsed = Number(rawValue)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return parsed
}

function resolveClientKey(c: Context): string {
  const forwardedFor = c.req.header('x-forwarded-for')
  if (forwardedFor) {
    const [firstHop] = forwardedFor.split(',')
    if (firstHop && firstHop.trim()) {
      return firstHop.trim()
    }
  }

  const directAddress = c.req.header('x-real-ip') ?? c.req.header('cf-connecting-ip')
  return directAddress?.trim() || 'unknown-client'
}

const allowedOrigins = (process.env.API_CORS_ALLOW_ORIGINS ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOrigin = allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins

const oracleRateLimiter = rateLimiter({
  windowMs: parsePositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  limit: parsePositiveInt(process.env.API_RATE_LIMIT_MAX, 100),
  keyGenerator: resolveClientKey
})

app.use(
  '*',
  cors({
    origin: corsOrigin,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'RateLimit-Policy'],
    maxAge: 86400
  })
)

app.get('/', (c) => {
  return c.json({ service: 'verokodo-api', status: 'ready' })
})

app.get('/health', (c) => {
  return c.json({ ok: true })
})

app.post('/oracle', oracleRateLimiter, async (c) => {
  const body = await c.req.json()
  const request = parseOracleRequest(body)

  if (request.provider !== 'github') {
    throw new HTTPException(400, { message: 'Only GitHub is supported in Tier 1.' })
  }

  const signals = await fetchGitHubSignals(request.username)
  const reading = await generateOracleReading(request, signals)

  return c.json(reading)
})

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    if (error.status >= 500) {
      console.error(`[api] ${c.req.method} ${c.req.path}: ${error.message}`)
    }
    return c.json({ error: error.message }, error.status)
  }

  if ('issues' in error && Array.isArray(error.issues)) {
    const zodError = error as ZodError
    return c.json(
      {
        error: 'Invalid request payload.',
        issues: zodError.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
      },
      400
    )
  }

  console.error(`[api] ${c.req.method} ${c.req.path}: unexpected error`, error)
  return c.json({ error: 'Internal server error.' }, 500)
})

export default app
