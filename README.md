# Studdy Buddy

AI tutoring platform where the tutor adapts its teaching to each student and answers from their course material.

**Status:** discontinued MVP, built from May to August 2026. Finalist at Scale UP (Emprende UP).

## What it does

- **Personalized tutoring:** onboarding answers and tutor surveys become a validated learning profile that shapes the tone, depth and style of the chat.
- **Grounded answers:** the chat retrieves the relevant sections of the student's course material and includes them in the prompt.
- **Course files:** upload, preview and text extraction for PDF and DOCX files.
- **Three roles:** students, tutors and admins, with admin approval for every new account.

## Engineering notes

- Server-side guards protect pages and API routes, with ownership checks on student, course, file and survey resources.
- A Postgres advisory lock enforces the chat session limit under concurrent requests.
- The AI layer sits behind a provider switch. `mock` (the default, no keys needed) and `nvidia-nim` work; the `anthropic` and `openai` options are unimplemented stubs.

## Claude Code agent setup

The repository includes the workflow used to build it: 16 specialized subagents in [`.claude/agents`](.claude/agents), covering planning, implementation, security review, QA and release. They are development tooling and do not run inside the product.

## Stack

Next.js 16 · React 19 · TypeScript · Supabase (Auth, Postgres, Storage) · Tailwind CSS 4 · Zod

## Run locally

```bash
npm install
cp .env.example .env.local   # add your Supabase values
npm run dev
```

The migrations in `supabase/` are incremental and do not include the base schema, so a new Supabase project needs that schema first. There is no automated test suite; use `npm run lint` and `npm run build`.
