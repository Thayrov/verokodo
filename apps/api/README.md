# Verokodo API

Languages: [English](./README.md) | [Español](./README.es.md)

Hono API service for profile ingestion and oracle generation.

## Commands

- `bun run dev` - run local API server on port 3000

### Endpoints

- `GET /` - service metadata
- `GET /health` - liveness check
- `POST /oracle` - generate a reading from public GitHub signals

### Required env

- `GOOGLE_GENERATIVE_AI_API_KEY`

### Optional env

- `VEROKODO_MODEL` (default: `gemini-3.1-flash-lite-preview`)
