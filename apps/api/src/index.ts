import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

import { parseOracleRequest } from '@verokodo/shared'

import { fetchGitHubSignals } from './github-signals'
import { generateOracleReading } from './oracle-generator'

const app = new Hono()

app.use('*', cors())

app.get('/', (c) => {
  return c.json({ service: 'verokodo-api', status: 'ready' })
})

app.get('/health', (c) => {
  return c.json({ ok: true })
})

app.post('/oracle', async (c) => {
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
