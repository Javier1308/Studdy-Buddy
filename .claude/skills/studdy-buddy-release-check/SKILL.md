---
name: studdy-buddy-release-check
description: Use when preparing Studdy Buddy for production deployment, release readiness, smoke testing, environment verification, and rollback planning.
---

# Studdy Buddy Release Check Skill

## Purpose

Prepare Studdy Buddy for safe deployment.

## When to use

Use this skill for:

- production readiness;
- deploy preparation;
- release audits;
- environment checks;
- smoke test planning;
- rollback planning.

## Required checks

```txt
- npm run lint passes.
- npm run build passes.
- Required env vars are configured.
- Supabase Auth settings are production-ready.
- Supabase RLS has been reviewed.
- Supabase Storage policies have been reviewed.
- SMTP status is known.
- Captcha status is known.
- Rate limiting status is known.
- AI_PROVIDER config is known.
- Smoke tests are documented.
- Rollback plan exists.
```

## Environment variables

Verify presence only. Do not print secret values.

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
AI_PROVIDER
ANTHROPIC_API_KEY if AI_PROVIDER=anthropic
```

## Release blockers

```txt
- Build fails.
- Lint fails with relevant errors.
- Auth guard bypass exists.
- Student can access another student's data.
- Tutor can access unassigned data.
- Admin-only endpoint accessible by non-admin.
- RLS unsafe or disabled on sensitive tables.
- Storage policies allow unauthorized access.
- Courses are hard-deleted.
- profiles.full_name is reintroduced.
- AI chat answers without approved course context.
- File endpoints allow cross-student access.
- Security review has unresolved critical/high issues.
```

## Output format

```md
# Release Readiness Report

## Build status

## Lint status

## Env vars

## Supabase Auth config

## RLS status

## Storage status

## AI provider config

## Smoke tests

## Rollback plan

## Release decision
```

## Must not

- Do not deploy without explicit instruction.
- Do not print secrets.
- Do not approve release with critical/high unresolved issues.
