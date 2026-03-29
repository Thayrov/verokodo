# Verokodo Decision Log

This document records durable product and architecture decisions for the hackathon build.

## D-001: Build only Tier 1 for submission

- **Decision:** ship only the no-auth public-profile experience.
- **Why:** lower scope and delivery risk; higher chance of polished UX.
- **Implication:** Tier 2 remains roadmap only.

## D-002: Frontend is Astro (not a React SPA)

- **Decision:** use Astro pages with View Transitions and CSS animation.
- **Why:** simpler implementation and less shipped client JS.
- **Implication:** immersion comes from design and transitions, not WebGL.

## D-003: Keep UI architecture intentionally simple

- **Decision:** avoid heavy state libraries and complex client architecture.
- **Why:** flow is short and linear (`/` -> `/loading` -> `/result`).
- **Implication:** faster iteration and lower breakage risk before deadline.

## D-004: Backend stack is Bun + Hono

- **Decision:** run API endpoints on Bun with Hono.
- **Why:** fast startup, small surface area, good fit for hackathon speed.
- **Implication:** one lightweight service powers ingestion and AI orchestration.

## D-005: AI layer is Vercel AI SDK + configurable model

- **Decision:** use Vercel AI SDK with Google provider; model chosen via `VEROKODO_MODEL`.
- **Why:** keep provider/model wiring flexible while preserving speed and cost control.
- **Implication:** default model stays `gemini-3.1-flash-lite-preview` unless overridden.

## D-006: No database in Tier 1

- **Decision:** stateless request/response flow.
- **Why:** no auth and no persistence requirements for MVP.
- **Implication:** lower operational overhead and simpler deployment.

## D-007: Monorepo managed with Bun workspaces

- **Decision:** keep apps/packages in one repo with Bun workspaces.
- **Why:** one toolchain for install/run/filtering and lower setup overhead.
- **Implication:** root `package.json` owns workspace boundaries.

## D-008: Prioritize work by judging criteria

- **Decision:** resolve tradeoffs with this order: UX, creativity, utility, technical implementation.
- **Why:** aligns execution to how the project is evaluated.
- **Implication:** polish and narrative quality take precedence over optional features.

## D-009: Delivery strategy is demo-safe first

- **Decision:** ship one complete vertical slice early, then polish.
- **Why:** reduces late integration risk and supports reliable demos.
- **Implication:** latency control (constrained prompts/context, lightweight model) is mandatory.

## Non-goals for hackathon submission

- Full multi-provider OAuth
- Private repository scanning
- Voice generation pipeline
- Long-term user data persistence
- Enterprise-scale codebase analysis
