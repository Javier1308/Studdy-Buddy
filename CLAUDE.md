# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run lint     # ESLint
```

There is no test suite configured.

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=mock          # or "anthropic"
ANTHROPIC_API_KEY=        # required only when AI_PROVIDER=anthropic
```

`lib/env.ts` validates these at runtime; `validateEnv()` is called inside `createAdminClient()`.

## Architecture

**Stack:** Next.js 16 App Router · React 19 · Supabase (auth + DB + Storage) · Tailwind CSS v4 · Zod · Anthropic SDK (wired but not yet active in chat)

### Roles & auth flow

Three roles: `student`, `tutor`, `admin`. Every new account starts `approval_status = "pending"` — admin must approve it. Auth flow: register → email confirmation → admin approval → role-specific dashboard.

- **Page guard:** `getApprovedUserOrRedirect()` (`lib/auth/require-approved-user.ts`) — used in Server Components
- **API guard:** `requireApprovedApiUser()` (`lib/auth/require-approved-api-user.ts`) — returns `{ user, error: null }` or `{ user: null, error: NextResponse }`

**Never bypass these guards.** Do not replace `requireApprovedApiUser()` with a bare `supabase.auth.getUser()` in protected endpoints.

### Supabase clients — never mix them

| Client | Factory | When to use |
|--------|---------|-------------|
| Server (RLS) | `createServerSupabaseClient()` — `lib/supabase/server.ts` | Server Components |
| Admin (bypasses RLS) | `createAdminClient()` — `lib/supabase/admin.ts` | Route handlers needing privileged access |

### Authorization helpers (`lib/auth/course-access.ts`)

Use these for ownership checks — never trust `courseId`/`fileId`/`studentId` directly from the request:

- `getStudentCourseAccessContext({ user, courseId })` — validates student's active assignment to a course
- `getStudentFileAccessContext({ user, fileId })` — validates file ownership and that the course is still active
- `canAccessStudentCourse({ user, studentId, courseId? })` — admin: all; tutor: own assignments; student: self

When a user lacks access, return `404` (not `403`) to avoid leaking existence of other users' resources.

### Database schema (key tables)

- `profiles` — `id` matches `auth.users.id`; holds `role`, `approval_status`, `first_name`, `last_name`. **`full_name` was removed — never reintroduce it.**
- `students` / `tutors` — linked to `profiles` via `profile_id`
- `grades` — academic grade catalog; `tutor_grades` maps tutors to grades they teach
- `courses` — soft-deleted via `deleted_at`; **all normal queries must filter `.is("deleted_at", null)`**. When deleted: set `student_course_tutors.is_active = false`. Never hard-delete courses.
- `student_course_tutors` — source of truth for student ↔ course ↔ tutor; stores `active_skill_md`; `UNIQUE(student_id, course_id)`
- `tutor_feedback_surveys` — max 3 active surveys per student+course; only one can be `is_promoted = true`; cannot delete the promoted one
- `uploaded_files` — soft-deleted via `deleted_at`; `extraction_status`: `pending | processing | completed | failed`
- `course_contexts` — one compiled markdown blob per student+course in Supabase Storage; `compile_status` must be `completed` for chat
- `chat_sessions` / `chat_messages` — one session per student+course (`UNIQUE`)
- `profile_update_requests` — `request_type`: `student_grade_change` | `tutor_grades_change`; `UNIQUE(profile_id, request_type) WHERE status = 'pending'`

### Names — always use `first_name` + `last_name`

Use `getProfileDisplayName(profile, fallback?)` from `lib/profiles/display-name.ts` everywhere a display name is needed. `profiles.full_name` was deleted.

### AI / skill.md system

`skill.md` is a structured markdown persona validated by `lib/ai/validate-skill-md.ts` (7 required sections). Flow:

1. Tutor fills survey → `/api/surveys`
2. Generate draft → `/api/surveys/[surveyId]/generate`
3. Promote to `active_skill_md` on `student_course_tutors` → `/api/surveys/[surveyId]/promote`
4. `/api/chat` reads `active_skill_md` + compiled `course_contexts` and passes to AI

`AI_PROVIDER=mock` (default) returns a hardcoded response. The Anthropic branch in `lib/chat/provider.ts` currently throws — not yet implemented.

### File pipeline

Students upload PDF/DOCX. Route handlers: upload → extract (mammoth for DOCX, pdf-parse for PDF) → student reviews extracted text → confirm → compiled into a single markdown blob in Supabase Storage (`contexts/` bucket). `/api/files/[fileId]/delete` uses **POST** (not DELETE — `DELETE` returns 405).

### Route structure

```
app/
  (public)   page.tsx, login/, register/, verify-email/, pending-approval/, account-rejected/
  profile/   shared across all roles; /admin|student|tutor/profile should redirect here
  student/   layout guards role=student; courses/[courseId]/chat is the AI chat UI
  tutor/     layout guards role=tutor; students/[studentId]/courses/[courseId]/survey manages skill.md
  admin/     layout guards role=admin; dashboard manages accounts, courses, assignments, update requests
  api/       route handlers grouped by domain: auth, chat, files, surveys, admin, tutor, profile
```

### Admin course restore

`POST /api/admin/courses/[courseId]/restore` — restores a soft-deleted course.

- Guarded by `requireApprovedApiUser()` + explicit `role === "admin"` check.
- Sets `courses.deleted_at = null` only. It does **not** touch `student_course_tutors.is_active` (ADR 0001). Assignment reactivation is a separate future feature.
- Restored courses remain inaccessible to students/tutors whose assignments are still `is_active = false`.
- Idempotent: if `deleted_at` is already `null`, returns `{ success: true, alreadyRestored: true }`.

### Styling

Tailwind CSS v4 (PostCSS). Design tokens are inline — primary blue `#2E6F87`, background `#F7F5F0`, text `#1C2E36`. No CSS variables or design system file.
