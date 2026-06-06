# Studdy Buddy Agent Pipeline

## Purpose

This directory contains specialized Claude Code subagents for developing Studdy Buddy. Each agent has a specific role in the feature development, review, testing, and release pipelines.

## Core project rules

All agents must follow these rules:

- Read `CLAUDE.md` before making decisions.
- Do not bypass existing auth helpers.
- Do not replace `requireApprovedApiUser()` with raw `supabase.auth.getUser()` in protected endpoints.
- Do not trust request-provided IDs without ownership validation.
- Do not reveal whether inaccessible resources exist.
- Use `404` for inaccessible student/course/file/survey resources.
- Do not hard-delete courses.
- Do not reintroduce `profiles.full_name`.
- Prefer small patches over broad rewrites.
- Preserve existing architecture unless a change is explicitly requested.
- Run `npm run build` after implementation changes when practical.
- Run `npm run lint` after code style or TS changes when practical.
- Update documentation when behavior changes.

## Available agents

| Agent | Role | Modifies Code |
|-------|------|---------------|
| `studdy-buddy-orchestrator` | Classifies tasks and recommends agent pipelines | No |
| `feature-planner` | Plans features before implementation | No |
| `fullstack-feature-builder` | Implements approved full-stack features | Yes |
| `auth-authorization-reviewer` | Reviews role-based access control and ownership checks | No |
| `supabase-schema-rls-reviewer` | Validates DB schema, constraints, indexes, RLS, and Storage policies | No |
| `ai-chat-guardrails-builder` | Implements and reviews Studdy Buddy AI behavior | Yes |
| `file-pipeline-builder` | Builds file upload, extraction, review, confirmation, and compilation | Yes |
| `tutor-survey-skill-builder` | Improves tutor feedback surveys and skill.md generation | Yes |
| `admin-ops-builder` | Builds and improves admin operational features | Yes |
| `ui-polish-reviewer` | Reviews and improves UI consistency, UX, and accessibility | Yes |
| `test-engineer` | Introduces and maintains the minimal test suite | Yes |
| `regression-qa` | Runs manual and automated regression checklists | No |
| `security-reviewer` | Performs security review before release | No |
| `code-quality-refactorer` | Improves maintainability without changing behavior | Yes |
| `release-manager` | Prepares the app for deployment and production readiness | No |
| `documentation-maintainer` | Keeps technical documentation synchronized with codebase | Yes |

## Getting started with a new task

**Start with the orchestrator agent** to classify your task and get a recommended pipeline:

1. **`studdy-buddy-orchestrator`** — Classify the task, recommend the agent pipeline, identify gates and validation requirements.

## Orchestrator-first workflow

For medium or large tasks, start with `studdy-buddy-orchestrator` before using any implementation or review agent.

The orchestrator is responsible for:

- classifying the task;
- selecting the correct agent pipeline;
- identifying required project skills;
- deciding required review gates;
- producing the exact next prompt to run.

Default flow:

```txt
User request
→ studdy-buddy-orchestrator
→ selected planner/builder/reviewer agents
→ regression-qa
→ documentation-maintainer if behavior changed
```

## Recommended feature pipeline

For a typical feature request (after orchestrator):

1. **`feature-planner`** — Understand the feature, inspect files, identify impact, break work into tasks.
2. **`fullstack-feature-builder`** — Implement the feature across UI, API, and DB.
3. **`auth-authorization-reviewer`** — Review role-based access and ownership checks.
4. **`supabase-schema-rls-reviewer`** — Validate DB schema if affected.
5. **`test-engineer`** — Add tests for the new feature.
6. **`regression-qa`** — Run regression checklist.
7. **`documentation-maintainer`** — Update `CLAUDE.md` and `AGENTS.md`.

## Recommended AI feature pipeline

For AI/chat features:

1. **`feature-planner`** — Plan the AI behavior and guardrails.
2. **`ai-chat-guardrails-builder`** — Implement the AI behavior.
3. **`fullstack-feature-builder`** — Implement supporting UI and API routes.
4. **`security-reviewer`** — Review prompt/context leakage risks.
5. **`test-engineer`** — Add tests for AI behavior.
6. **`regression-qa`** — Run regression checklist.
7. **`documentation-maintainer`** — Update documentation.

## Recommended file feature pipeline

For file upload/extraction features:

1. **`feature-planner`** — Plan the file pipeline changes.
2. **`file-pipeline-builder`** — Build upload, extraction, review, confirmation, and compilation flows.
3. **`auth-authorization-reviewer`** — Review file access and ownership.
4. **`supabase-schema-rls-reviewer`** — Validate Storage policies and DB changes.
5. **`test-engineer`** — Add tests for file flows.
6. **`regression-qa`** — Run regression checklist.
7. **`documentation-maintainer`** — Update documentation.

## Recommended release pipeline

Before deployment:

1. **`regression-qa`** — Run full regression checklist.
2. **`security-reviewer`** — Perform security review.
3. **`supabase-schema-rls-reviewer`** — Validate RLS and Storage.
4. **`release-manager`** — Prepare release checklist and smoke tests.
5. **`documentation-maintainer`** — Ensure documentation is up-to-date.

## Project skills

Studdy Buddy uses project-local Claude Code skills under `.claude/skills/`.

Skills are reusable workflows, rules, commands, and validation checklists. Agents reference them through each agent's `Required project skills` section.

### Available skills

| Skill | Purpose |
|---|---|
| `studdy-buddy-feature-planning` | Plans features, bugfixes, refactors, and UI changes before implementation. |
| `studdy-buddy-auth-review` | Reviews authentication, authorization, role checks, ownership, and IDOR risks. |
| `studdy-buddy-supabase-rls-review` | Reviews Supabase schema, migrations, RLS, indexes, constraints, and Storage policies. |
| `studdy-buddy-ai-guardrails` | Reviews AI chat, prompt structure, skill.md, course context usage, and refusal behavior. |
| `studdy-buddy-file-pipeline` | Reviews upload, extraction, preview, confirmation, deletion, and context compilation. |
| `studdy-buddy-testing` | Defines minimal testing strategy and priority tests. |
| `studdy-buddy-regression-qa` | Runs lint/build, grep checks, and manual regression checklists. |
| `studdy-buddy-release-check` | Validates production readiness, env vars, release blockers, and rollback planning. |

### Installed framework and platform skills

Agents also reference installed Claude Code skills for Next.js, Supabase, and Tailwind:

| Skill | Purpose |
|---|---|
| `nextjs-app-router-patterns` | Next.js App Router patterns, Server Components, and best practices. |
| `nextjs-supabase-auth` | Next.js + Supabase authentication integration and patterns. |
| `supabase` | Supabase platform features, client libraries, and best practices. |
| `supabase-postgres-best-practices` | PostgreSQL schema design, indexing, and performance. |
| `tailwind-v4-shadcn` | Tailwind CSS v4 and shadcn/ui component patterns. |

## Installed framework/platform skills

These skills were installed before the Studdy Buddy custom skills and should be used when relevant:

| Skill | Use for |
|---|---|
| `nextjs-app-router-patterns` | Next.js App Router, Server Components, Route Handlers, layouts, loading/error states. |
| `nextjs-supabase-auth` | Supabase Auth patterns in Next.js, session handling, protected routes, auth callbacks. |
| `supabase` | Supabase client usage, Auth, Database, Storage, Edge patterns. |
| `supabase-postgres-best-practices` | PostgreSQL schema design, RLS, indexes, constraints, migrations, query safety. |
| `tailwind-v4-shadcn` | Tailwind v4 UI patterns, shadcn-style components, responsive UI, form polish. |

## Agents allowed to modify code

- `fullstack-feature-builder`
- `ai-chat-guardrails-builder`
- `file-pipeline-builder`
- `tutor-survey-skill-builder`
- `admin-ops-builder`
- `ui-polish-reviewer`
- `test-engineer`
- `code-quality-refactorer`
- `documentation-maintainer`

## Review-only agents by default

- `studdy-buddy-orchestrator`
- `feature-planner`
- `auth-authorization-reviewer`
- `supabase-schema-rls-reviewer`
- `regression-qa`
- `security-reviewer`
- `release-manager`

## Required validation commands

All agents must run these after changes:

```bash
npm run lint
npm run build
```

## Required grep checks

All agents must verify these invariants:

```bash
# Check for reintroduced full_name
grep -RIn "full_name\|fullName" app lib components

# Check that auth helpers are being used
grep -RIn "getStudentCourseAccessContext\|getStudentFileAccessContext\|canAccessStudentCourse" app lib

# Check that courses use soft delete filtering
grep -RIn 'from("courses")' app lib components
```

## Release blockers

Do not release if any of these are true:

- Build fails (`npm run build` exits with non-zero).
- Lint fails with relevant errors (`npm run lint`).
- Auth guard bypass found (e.g., raw `supabase.auth.getUser()` in protected endpoints).
- Student can access another student's data.
- Tutor can access unassigned student/course.
- Admin-only endpoint accessible by non-admin.
- Courses are hard-deleted.
- `profiles.full_name` is reintroduced.
- AI chat answers without approved course context.
- File endpoints allow cross-student access.
