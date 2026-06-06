# Architecture Decision Records (ADRs)

This directory contains architecture decisions for Studdy Buddy, following the Architecture Decision Record (ADR) format.

Each decision is numbered sequentially and documents the problem, decision, rationale, and consequences.

## Index

| # | Title | Date | Status |
|---|-------|------|--------|
| [0001](./0001-restore-soft-deleted-courses.md) | Course Restore Behavior — Decoupled Visibility and Assignment Status | 2026-02-27 | Accepted |

## How to Add a Decision

1. Create a new file: `000N-title-slug.md` (increment the number)
2. Use the ADR template: Problem → Decision → Rationale → Consequences
3. Include verification gates and related decisions
4. Update this README with the new decision in the index
5. Reference the decision in feature documentation and implementation plans

## Related Documentation

- `CLAUDE.md` — Core project rules and architecture patterns
- `.claude/agents/README.md` — Agent pipeline and workflow documentation
- `docs/architecture/` — Other architecture guides and design decisions
