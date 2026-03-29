# Verokodo

Languages: [English](./README.md) | [Español](./README.es.md)

An immersive developer experience that reads a public coding profile and returns an oracle-style prophecy based on real public data.

## Demo

- Hackathon demo URL: coming soon

## What It Is

- Input a public username (GitHub first, GitLab optional)
- Fetch public profile signals (profile, repositories, profile README)
- Generate a dramatic, actionable oracle output with AI
- Present results in an immersive CSS-driven flow
- Share a final prophecy

Tier 1 is public-data only: no auth and no private repository access.

## Current Status

- Web routes: `/` -> `/loading` -> `/result`
- API routes: `GET /`, `GET /health`, `POST /oracle`
- `POST /oracle` pipeline: request validation, GitHub ingestion, AI generation, response validation

## Stack

- Frontend: Astro (`apps/web`)
- Backend: Hono on Bun (`apps/api`)
- Shared contracts: Zod schemas (`packages/shared`)
- AI SDK: Vercel AI SDK with Google provider
- Model: configurable with `VEROKODO_MODEL` (default `gemini-3.1-flash-lite-preview`)

## Local Setup

1. Copy `.env.example` to `.env` and set `GOOGLE_GENERATIVE_AI_API_KEY`
2. Install dependencies: `bun install`
3. Start API: `bun run dev:api`
4. Start web in another terminal: `bun run dev:web`
5. Open the app and run a GitHub username reading

Environment variables:

- `GOOGLE_GENERATIVE_AI_API_KEY` (required)
- `VEROKODO_MODEL` (optional)
- `PUBLIC_API_BASE_URL` (optional, default `http://localhost:3000`)

## Hackathon Compliance Checklist

- [ ] App deployed on CubePath
- [ ] Public repository
- [ ] `README.md` with demo link
- [ ] Screenshots/GIFs of experience
- [ ] Explain CubePath usage in docs
- [ ] Register project via issue before deadline
- [ ] Ensure project is fully functional at review time

## Additional Docs

- Decisions and architecture notes: `docs/DECISIONS.md`
