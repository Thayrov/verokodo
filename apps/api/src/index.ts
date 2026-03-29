import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.json({ service: 'verokodo-api', status: 'ready' })
})

app.get('/health', (c) => {
  return c.json({ ok: true })
})

export default app
