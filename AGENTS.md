# Verokodo Agent Guide

Purpose: keep implementation aligned with durable project decisions and avoid ad-hoc architecture drift.

## Scope

- This file applies to the whole repository.
- In monorepo subprojects, add nested `AGENTS.md` files only when a subproject needs stricter local rules.

## Required Decision Workflow

1. Before planning or coding, read `docs/DECISIONS.md`.
2. Treat `docs/DECISIONS.md` as the source of truth for product and architecture tradeoffs.
3. If a task introduces or changes a durable decision, update `docs/DECISIONS.md` in the same change.
4. Do not add temporary status notes, timelines, or sprint logs to `docs/DECISIONS.md`.

## When To Update docs/DECISIONS.md

Update when changes affect one of these:

- architecture or stack direction
- scope boundaries and non-goals
- delivery policy that impacts future implementation choices
- model/provider strategy or other long-lived technical defaults

Do not update for:

- bug fixes with no decision impact
- refactors that keep the same architecture decision
- routine content or copy updates

## Decision Entry Format

Use this format for new entries:

```md
## D-010: Short title

- **Decision:** what was decided.
- **Why:** core rationale and tradeoff.
- **Implication:** what future work must follow from this.
```

Rules:

- increment the numeric ID sequentially
- keep entries concise and durable
- prefer modifying the existing entry when clarifying the same decision

## Build And Verification Expectations

- If source code changes, run relevant checks before finishing.
- Current baseline check: `bun run build:web`.
- If no automated test exists for touched code, state that clearly in completion notes.

## Plan Mode

When asked for a plan, keep it concise and end with unresolved questions (if any).

## Living Document

Keep this file and `docs/DECISIONS.md` current as the project evolves.
