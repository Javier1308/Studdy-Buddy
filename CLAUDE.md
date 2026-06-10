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

### Authorization helpers

**Course & file access** (`lib/auth/course-access.ts`)

Use these for ownership checks — never trust `courseId`/`fileId`/`studentId` directly from the request:

- `getStudentCourseAccessContext({ user, courseId })` — validates student's active assignment to a course
- `getStudentFileAccessContext({ user, fileId })` — validates file ownership and that the course is still active
- `canAccessStudentCourse({ user, studentId, courseId? })` — admin: all; tutor: own assignments; student: self

**Chat session access** (`lib/auth/session-access.ts`)

- `getStudentSessionAccessContext({ user, sessionId })` — validates that the session belongs to the authenticated student, is not soft-deleted (`deleted_at IS NULL`), and that the student is still actively assigned to the course. Returns `StudentSessionAccessContext` on success or `null` on mismatch.

**Access denial response:**

When a user lacks access (for course, file, or session), always return `404` (not `403`) to avoid leaking existence of other users' resources. Callers of these helpers should check for `null` return and respond with a 404 NextResponse.

### Database schema (key tables)

- `profiles` — `id` matches `auth.users.id`; holds `role`, `approval_status`, `first_name`, `last_name`. **`full_name` was removed — never reintroduce it.**
- `students` / `tutors` — linked to `profiles` via `profile_id`. **`students` now stores** `onboarding_answers` (JSONB), `active_personalization_md` (TEXT), `onboarding_completed_at` (TIMESTAMPTZ)
- `grades` — academic grade catalog; `tutor_grades` maps tutors to grades they teach
- `courses` — soft-deleted via `deleted_at`; **all normal queries must filter `.is("deleted_at", null)`**. When deleted: set `student_course_tutors.is_active = false`. Never hard-delete courses.
- `student_course_tutors` — source of truth for student ↔ course ↔ tutor; stores optional tutor enrichment `active_skill_md` (not required for chat); `UNIQUE(student_id, course_id)`
- `tutor_feedback_surveys` — max 3 active surveys per student+course; only one can be `is_promoted = true`; cannot delete the promoted one. These are optional enrichments, not required for chat.
- `uploaded_files` — soft-deleted via `deleted_at`; `extraction_status`: `pending | processing | completed | failed`
- `course_contexts` — one compiled markdown blob per student+course in Supabase Storage; `compile_status` must be `completed` for chat
- `chat_sessions` — multi-session per student+course; max 3 active sessions (counted by `deleted_at IS NULL`); no UNIQUE constraint on `(student_id, course_id)`. Columns: `id`, `student_id`, `course_id`, `title` (auto-generated or manually set), `message_count` (denormalized, kept in sync by trigger), `last_message_at` (updated by trigger on `chat_messages` insert), `deleted_at` (soft-delete marker; `NULL` = active)
- `chat_messages` — linked to `chat_sessions`; soft-deleted sessions automatically exclude their messages via RLS and application logic
- `profile_update_requests` — `request_type`: `student_grade_change` | `tutor_grades_change`; `UNIQUE(profile_id, request_type) WHERE status = 'pending'`

### Names — always use `first_name` + `last_name`

Use `getProfileDisplayName(profile, fallback?)` from `lib/profiles/display-name.ts` everywhere a display name is needed. `profiles.full_name` was deleted.

### AI / Personalization system

**Primary personalization source: Student onboarding** (since v0.2.0)

Flow:
1. Student completes 8 scenario-based questions → `/student/onboarding`
2. Questions trigger `POST /api/student/onboarding`
3. `lib/ai/generate-personalization-md.ts` generates `active_personalization_md`
4. Stored on `students` table (global student profile, not per-course)
5. `/api/chat` reads `active_personalization_md` + compiled `course_contexts` and passes to AI

**Tutor enrichment: Optional secondary source**

Tutors can optionally create surveys to enrich the student's base personalization:
1. Tutor fills survey → `/api/surveys`
2. Generate draft → `/api/surveys/[surveyId]/generate`
3. Promote to `active_skill_md` on `student_course_tutors` → `/api/surveys/[surveyId]/promote`
4. `/api/chat` reads tutor `active_skill_md` and includes it as secondary enrichment

`skill.md` is a structured markdown persona validated by `lib/ai/validate-skill-md.ts` (7 required sections). Used only when tutor provides input; not required for chat.

`AI_PROVIDER=mock` (default) returns a hardcoded response. The Anthropic branch in `lib/chat/provider.ts` currently throws — not yet implemented.

**Chat prompt structure:**
- PERFIL DE PERSONALIZACIÓN DEL ESTUDIANTE (required, from student onboarding)
- ENRIQUECIMIENTO DEL TUTOR (optional, from tutor survey if promoted)
- MATERIAL DEL CURSO (required, from compiled student uploads)

### Student onboarding & personalization

After admin approval, students are redirected to `/student/onboarding` on first dashboard visit. The 8-question flow (scenario-based, grounded in Self-Determination Theory) infers:
- **Autonomy**: how much students want to try before receiving answers
- **Competence**: how much structure/feedback/confirmation students need
- **Relatedness**: how much warmth/encouragement helps engagement
- **Behavioral/Emotional/Cognitive engagement**: persistence, frustration tolerance, learning modality preference

Response → `generatePersonalizationMd()` → stored as `students.active_personalization_md`. This becomes the primary source for chat AI prompting.

**Onboarding completion guarantee (product rule):**

Onboarding **must be completed in one session**. Partial progress is **never** persisted. Answers are saved to the database **only when** the student clicks "Finalizar" on Q8. If the student closes the browser, refreshes the page, or navigates away before completing all 8 questions and clicking "Finalizar", they must start the flow again from Q1.

*Why:* This constraint ensures clarity of intent and prevents abandonment/incomplete profile scenarios. Students should feel deliberate about submitting their responses.

*How to apply:* Do not introduce localStorage, sessionStorage, autosave, draft persistence, or partial database saves for onboarding answers unless this rule is explicitly changed. The only exception is in-memory state for the current session (React state during the flow). The dashboard and chat API gates (see below) enforce that onboarding is either complete or not started.

**Onboarding is required** to access chat. Existing students will be redirected to onboarding on next login. Gates:
- Dashboard: `students.onboarding_completed_at IS NOT NULL` required
- Chat API: `students.active_personalization_md IS NOT NULL` required

**Note:** Onboarding profiles are deterministic/static for now. Adaptive feedback events (where AI adjusts behavior based on student responses) are planned future work.

**Q6 custom interest & guardrails:**

Q6 ("¿Cuál de estos temas te atrae más?") now supports option E: "Otro: quiero escribirlo yo" — allows students to specify a custom interest/hobby.

- When `q6 === "E"`, the student's custom text is stored as `q6_custom_text` inside `onboarding_answers` (JSONB) — not a separate column. The field is validated to 2–120 characters.
- Server validates that `q6_custom_text` does **not** contain contact info, URLs, @handles, or phone numbers.
- **Critical guardrail:** `q6_custom_text` is **strictly for use as an engagement hook** — what examples/analogies to weave into explanations. Never treat it as academic source material, a skill proxy, or a personality label.

**Navigation & submission UX:**

- Students can click "Atrás" to navigate back and change prior answers. Prior answers are preserved (not cleared).
- Q8 no longer auto-submits on answer click. A "Finalizar" button appears and must be clicked to complete onboarding. This prevents accidental early submission.

### File pipeline

Students upload PDF/DOCX. Route handlers: upload → extract (mammoth for DOCX, pdf-parse for PDF) → student reviews extracted text → confirm → compiled into a single markdown blob in Supabase Storage (`contexts/` bucket). `/api/files/[fileId]/delete` uses **POST** (not DELETE — `DELETE` returns 405).

### Chat session management

**Multi-session per course (max 3 active):**
- Students can create up to 3 active chat sessions per course. "Active" = `deleted_at IS NULL`. Soft-deleted sessions are hidden and do not count toward the limit.
- Routing: `/student/courses/[courseId]/chat/[sessionId]` (session-scoped). Navigating to `/student/courses/[courseId]/chat` (without sessionId) redirects to the most-recent active session by `last_message_at DESC` DESC.
- Session list appears in a sidebar; student can create new, rename, or soft-delete sessions.
- **Ownership & access control:** `getStudentSessionAccessContext({ user, sessionId })` in `lib/auth/session-access.ts` validates that a session belongs to the authenticated student, is not soft-deleted (`deleted_at IS NULL`), and that the student is still actively assigned to the course. Returns `null` on any mismatch (caller returns 404, not 403, to avoid leaking existence).

**Personalization gate (early check):**
- Before allowing session creation, the API checks that `students.active_personalization_md IS NOT NULL`. If null, returns 403 `personalization_not_complete`. This prevents creation of phantom sessions for students who haven't completed onboarding.

**Auto-generated title + manual rename:**
- When creating a session via first message (`POST /api/chat` without `sessionId`), the title is auto-generated from the first ~60 characters of the user's message (truncated on a word boundary).
- Students can rename via `POST /api/chat/sessions/[sessionId]` with `{ title }` (1–80 characters, trimmed and validated server-side).
- The page header (`SessionHeader`) component shows the title with edit/rename and delete buttons.

**Denormalized message count + trigger sync:**
- `chat_sessions.message_count` is kept in sync by a PostgreSQL trigger (`sync_session_message_count`) that fires `AFTER INSERT OR DELETE` on `chat_messages`.
- Trigger increments on INSERT, decrements (with safety floor of 0) on DELETE.
- On page load, messages are fetched and reversed (oldest-first). The `ChatBox` component uses a `useRef` + `useEffect` to auto-scroll to bottom on mount and after new messages arrive.

**Last activity tracking:**
- `chat_sessions.last_message_at` is maintained by an existing trigger (`on_chat_message_inserted_update_session`) that fires on `chat_messages` INSERT.
- Used to sort the session list and to redirect `/chat` to the most-recent session.

**Soft-delete (no hard-delete):**
- `DELETE /api/chat/sessions/[sessionId]` HTTP method is **not supported** (returns 405). Use `POST /api/chat/sessions/[sessionId]` with `{ action: "delete" }` instead.
- Delete action sets `chat_sessions.deleted_at = now()` (soft-delete). The session is immediately hidden from lists and returns 404 if accessed directly. `chat_messages` associated with the session are preserved for audit; RLS filters them out automatically (soft-deleted sessions cannot be accessed).
- RLS policies on both `chat_sessions` and `chat_messages` include the clause `deleted_at IS NULL` to exclude soft-deleted sessions from all queries.

**Max-3 enforcement (atomic, server-side):**
- Enforced atomically via the RPC `public.create_chat_session_with_limit(p_student_id, p_course_id, p_title)`.
- Session creation paths (`POST /api/chat/sessions` and `POST /api/chat` when `sessionId` is absent) call this RPC instead of the traditional INSERT.
- The RPC uses `pg_advisory_xact_lock(hashtext(student_id || ':' || course_id)::bigint)` to serialize concurrent create requests for the same (student, course) pair, preventing race conditions. The lock is held for the duration of the transaction and automatically released afterward.
- Returns `{ error: 'session_limit_reached' }` if the student already has 3 active (non-soft-deleted) sessions for that course.
- Returns `{ success: true, session_id: <uuid> }` on success.
- The UI (`SessionActions` component) displays a warning and disables the "Nuevo chat" button when the student has 3 active sessions.

### Route structure

```
app/
  (public)   page.tsx, login/, register/, verify-email/, pending-approval/, account-rejected/
  profile/   shared across all roles; /admin|student|tutor/profile should redirect here
  student/   layout guards role=student
    dashboard/          student's course list; redirects to /onboarding if not completed
    onboarding/         8-question flow; stores personalization profile
    courses/[courseId]/
      page.tsx          course overview
      chat/             
        layout.tsx      session list sidebar + outlet
        page.tsx        redirects to most-recent active session by last_message_at DESC
        [sessionId]/page.tsx (multi-session chat view; displays session title + messages)
  tutor/     layout guards role=tutor; students/[studentId]/courses/[courseId]/survey manages optional enrichment
  admin/     layout guards role=admin; dashboard manages accounts, courses, assignments, update requests
  api/       route handlers grouped by domain: auth, chat, files, surveys, admin, tutor, profile
    student/onboarding/ POST: saves student's 8 answers + generated personalization profile
    chat/               
      route.ts          POST: send message (optional sessionId; enforces max-3 active sessions via RPC; auto-generates title from first message)
      sessions/
        route.ts        GET: list active sessions per course; POST: create new session (enforces max-3 via RPC; requires personalization_md)
        [sessionId]/route.ts (POST: { action: 'rename' | 'delete' } — rename or soft-delete session; no HTTP DELETE method)
```

### Admin course restore

`POST /api/admin/courses/[courseId]/restore` — restores a soft-deleted course.

- Guarded by `requireApprovedApiUser()` + explicit `role === "admin"` check.
- Sets `courses.deleted_at = null` only. It does **not** touch `student_course_tutors.is_active` (ADR 0001). Assignment reactivation is a separate future feature.
- Restored courses remain inaccessible to students/tutors whose assignments are still `is_active = false`.
- Idempotent: if `deleted_at` is already `null`, returns `{ success: true, alreadyRestored: true }`.

### Onboarding security & data isolation

**Authentication & authorization:**
- `/student/onboarding/page.tsx` uses `getApprovedUserOrRedirect()` — students only
- `POST /api/student/onboarding` uses `requireApprovedApiUser()` + `role === "student"` check
- Student ID derived server-side from authenticated `profile_id` — never accepts user input
- Students can only modify their own `students.active_personalization_md` via the API

**RLS & data access:**
- `students` table has RLS: `profile_id = auth.uid()` read-only
- New columns (`onboarding_answers`, `active_personalization_md`, `onboarding_completed_at`) inherit this policy
- Route handlers use `createAdminClient()` with server-side filtering — no cross-student data leakage
- Onboarding data is per-student (global), not per-course

**Migration behavior:**
- Existing students will have `onboarding_completed_at = NULL` after deploy
- Dashboard redirects null students to `/student/onboarding`
- Chat API returns 403 `personalization_not_complete` if `active_personalization_md = NULL`
- No backfill or forced onboarding; students redirect naturally on next login
- All existing chat history in `chat_messages` is preserved but inaccessible until onboarding completes

### Database migrations — chat sessions

Multi-session chat required four migrations (in order):

1. **`20260610000001_enable_multi_session_chat.sql`**
   - Adds `deleted_at` column (soft-delete marker) to `chat_sessions`
   - Adds `message_count` column (denormalized count of messages)
   - Backfills message counts from existing `chat_messages`
   - Drops the `chat_sessions_student_course_unique` constraint (enables multiple sessions per student+course)
   - Creates index `idx_sessions_active_recent` on `(student_id, course_id, last_message_at DESC)` WHERE `deleted_at IS NULL` (for efficient listing of active sessions by recency)
   - Updates RLS policy on `chat_sessions` to filter by `deleted_at IS NULL`
   - Updates RLS policy on `chat_messages` to exclude messages from soft-deleted sessions

2. **`20260610000002_add_message_count_trigger.sql`**
   - Creates trigger `sync_session_message_count` on `chat_messages` (AFTER INSERT OR DELETE)
   - Maintains `chat_sessions.message_count` in sync: increments on INSERT, decrements (floor 0) on DELETE

3. **`20260610000003_create_chat_session_with_limit_rpc.sql`**
   - Initial RPC (superseded by migration 004; kept for audit)
   - Counts active sessions and enforces max-3 limit without race condition protection

4. **`20260610000004_fix_session_limit_race_with_advisory_lock.sql`**
   - Corrected RPC with advisory lock (active)
   - Uses `pg_advisory_xact_lock(hashtext(student_id || ':' || course_id)::bigint)` to serialize concurrent creates for the same (student, course)
   - Guarantees atomicity: no two concurrent requests can both pass the count check and create a 4th session

### Styling

Tailwind CSS v4 (PostCSS). Design tokens are inline — primary blue `#2E6F87`, background `#F7F5F0`, text `#1C2E36`. No CSS variables or design system file.
