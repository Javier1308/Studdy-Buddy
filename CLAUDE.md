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
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider (default: mock)
AI_PROVIDER=mock          # Options: mock | nvidia-nim | openai | anthropic

# NVIDIA NIM — required only when AI_PROVIDER=nvidia-nim
NVIDIA_NIM_API_KEY=<your-nvidia-nim-api-key>
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1    # optional; defaults to this
NVIDIA_NIM_MODEL=meta/llama-3.3-70b-instruct               # optional; defaults to this

# OpenAI — required only when AI_PROVIDER=openai (not yet implemented, throws)
OPENAI_API_KEY=sk-...

# Anthropic — required only when AI_PROVIDER=anthropic (not yet implemented, throws)
ANTHROPIC_API_KEY=sk-ant-...
```

**Validation:**
- `lib/env.ts` exports `validateEnv()` and `env` object. `validateEnv()` is called inside `createAdminClient()` at startup.
- If `AI_PROVIDER` is unrecognized, startup fails immediately.
- If `AI_PROVIDER=nvidia-nim` but `NVIDIA_NIM_API_KEY` is missing, startup fails.
- If `AI_PROVIDER=openai` but `OPENAI_API_KEY` is missing, startup fails.
- If `AI_PROVIDER=anthropic` but `ANTHROPIC_API_KEY` is missing, startup fails.

**Dev vs. production:**
- `.env.example` (committed) contains only placeholder values — safe to check in.
- `.env.local` (git-ignored) holds real keys and is never committed.
- Default `AI_PROVIDER=mock` requires no keys and is safe for development.

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

**AI provider adapter:**

Entry point: `lib/chat/provider.ts` — reads `env.aiProvider` and dispatches to the appropriate provider. With Phase B, providers receive a **messages array** (conversation history support) instead of separate `systemPrompt` and `userPrompt`.

Provider message structure (after Phase A/B):
```typescript
interface ProviderInput {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}
```

Messages array construction:
1. First message: `{ role: "system", content: systemPrompt }` (see system prompt structure above)
2. Prior messages: conversation history (up to 10 messages from current session)
3. Last message: `{ role: "user", content: currentUserMessage }`

Providers:
- **`lib/chat/providers/openai-compatible.ts`** — shared HTTP client for OpenAI-compatible APIs. Uses native `fetch`, no SDK. 30-second timeout via AbortController. Receives full messages array with history and retrieved course context. Used by NVIDIA NIM and future compatible APIs.
- **`lib/chat/providers/nvidia-nim.ts`** — NVIDIA NIM adapter. Reads `NVIDIA_NIM_API_KEY`, `NVIDIA_NIM_BASE_URL` (optional, defaults to `https://integrate.api.nvidia.com/v1`), and `NVIDIA_NIM_MODEL` (optional, defaults to `meta/llama-3.3-70b-instruct`) from env. Dispatches to `openai-compatible.ts` with full message array.
- **`lib/chat/providers/openai.ts`** — stub. Throws "OpenAI provider is not yet implemented".
- **`lib/chat/providers/anthropic.ts`** — stub. Throws "Anthropic provider is not yet implemented".

Supporting:
- **`lib/chat/build-chat-prompt.ts`** — builds `systemPrompt` from student personalization, tutor enrichment (optional), and retrieved course sections. This is the **only** source of system instructions and REGLA ABSOLUTA. Caller constructs the full messages array and passes it to the provider.
- **`lib/chat/mock-response.ts`** — mock response generator for development. Receives conversation history length only (count of prior messages, not raw text). Simulates realistic behavior without calling real APIs. Does **not** echo raw personalization or skill markdown to the client.

Provider contract: `generateChatResponse(input: ProviderInput)` → `Promise<string>` (assistant message text). On any error (network, timeout, provider returns 4xx/5xx, malformed response), throws. Route handler catches and returns 502 `ai_provider_error`.

Security guardrails:
- API keys are read from `env` object only — never hardcoded, logged, or returned in responses.
- Providers receive only the `messages` array (system prompt + history + current message) — they cannot access student ID, course ID, session ID, or raw profile data.
- `buildChatPrompt` is the sole source of system instructions and cannot be bypassed.
- Retrieved course sections are pre-filtered and embedded in the system prompt; raw storage paths or retrieval scores are never exposed.
- Mock provider receives only history count; full history text is not accessible to it.
- Message persistence happens before and after provider calls, with explicit error handling.

**Chat Memory (Phase A) — Conversation history**

Each `POST /api/chat` request retrieves the most recent 10 messages from the current session (ordered by `created_at ASC`, filtered to `role IN ('user', 'assistant')`). History is fetched **after** session ownership is confirmed via `getStudentSessionAccessContext()` and **before** the current user message is inserted. This ensures:
- No cross-session history bleed (strict scoping by `sessionId`)
- Current turn is not included in history (only prior messages)
- History fetch failure is non-fatal; chat continues with empty history

The conversation history is formatted as a messages array passed to the provider:
```
[
  { role: "system", content: systemPrompt },
  ...conversationHistory,  // up to 10 prior messages
  { role: "user", content: currentUserMessage }
]
```

Mock provider receives only the `conversationHistoryLength` (count of messages) — it does not receive or echo raw message content. NVIDIA NIM and OpenAI-compatible providers receive the full array with all history text.

**Course-Scope Retrieval and Hard Refusal (Phase B)**

Compiled course markdown is no longer injected in full. Instead, `retrieveRelevantCourseSections()` selects relevant sections based on keyword/token overlap:

- **Query construction:** concatenates current message + last assistant turn (if any) + last 2 user turns into a single query string
- **Scoring:** token intersection (unique tokens in section ∩ query) normalized by query token count, +0.15 bonus for heading match
- **Threshold:** 0.08 minimum relevance score
- **Top-K:** 4 sections (sorted by score descending)
- **Character budget:** total output capped at 6000 chars
- **Continuation bypass:** if conversation is established AND current message is short (<60 chars) AND tokens are low (<3), skip threshold check and rank by score only (allows natural follow-ups like "¿Y entonces?")

If no relevant sections found (all scores < 0.08):
- User message is persisted to database
- No AI provider is called
- Deterministic refusal is returned as assistant message
- Response: `{ success: true, sessionId, assistantMessage: "No encontré información sobre eso en el material de este curso. Te recomiendo revisar tus apuntes o consultar con tu tutor." }`

If relevant sections found:
- Sections are formatted and passed as `courseContextMarkdown` to the provider
- Provider is called with the full [system, ...history, user] message array

**System prompt structure (with Phase B hard refusal layer):**

The system prompt is built in this order:
1. **REGLA ABSOLUTA** (first, non-bypassable, compile-time constant):
   ```
   REGLA ABSOLUTA:
   Solo responde usando el MATERIAL DEL CURSO RELEVANTE incluido a continuación.
   Si la respuesta no está en ese material, responde exactamente:
   "No encontré información sobre eso en el material de este curso. Te recomiendo revisar tus apuntes o consultar con tu tutor."
   No uses conocimiento general bajo ninguna circunstancia.
   ```
2. Persona declaration
3. Behavior rules
4. Student personalization markdown (from `active_personalization_md`)
5. Optional tutor enrichment (from `active_skill_md`, if promoted survey exists)
6. Retrieved course sections (header: `MATERIAL DEL CURSO RELEVANTE PARA ESTA PREGUNTA:`)

**Message persistence with explicit error checking:**

All three insertion paths (user, refusal, assistant) include explicit error handling:
- User message inserted before AI call (error → 500)
- Refusal message inserted on hard refusal (error → 500)
- Assistant message inserted after provider response (error → 500)
- Errors logged; generic message returned to client

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
- Routing: `/student/courses/[courseId]/chat/[sessionId]` (session-scoped). Navigating to `/student/courses/[courseId]/chat` redirects to the most-recent active session by `last_message_at DESC`, or shows the compose state if no sessions exist.
- Session list appears in a sidebar (server-fetched in `layout.tsx`, passed as props to `SessionList`). Students can create new, rename, or soft-delete sessions.
- **Ownership & access control:** `getStudentSessionAccessContext({ user, sessionId })` in `lib/auth/session-access.ts` validates that a session belongs to the authenticated student, is not soft-deleted (`deleted_at IS NULL`), and that the student is still actively assigned to the course. Returns `null` on any mismatch (caller returns 404, not 403, to avoid leaking existence).

**Lazy session creation (compose state):**
- Clicking "Nuevo chat" navigates to `/student/courses/[courseId]/chat?new=1` (no API call, no DB row yet).
- `POST /api/chat/sessions` (eager-create endpoint) **no longer exists**. GET remains for legacy compatibility.
- A DB session row is created **only when the first message is sent** via `POST /api/chat` without a `sessionId`.
- Empty sessions cannot exist: if the student navigates away before sending a message, no row is created.
- This eliminates phantom (empty) sessions in the sidebar.

**Personalization gate (early check):**
- Before allowing session creation, `POST /api/chat` checks that `students.active_personalization_md IS NOT NULL`. If null, returns 403 `personalization_not_complete`. This prevents creation of phantom sessions for students who haven't completed onboarding.

**Auto-generated title + manual rename:**
- When creating a session via first message (`POST /api/chat` without `sessionId`), the title is auto-generated from the first ~60 characters of the user's message (truncated on a word boundary).
- Students can rename via the three-dot context menu in the sidebar (`RenameSessionDialog`), which posts to `POST /api/chat/sessions/[sessionId]` with `{ title }` (1–80 characters, trimmed and validated server-side).
- Session title is displayed in `SessionHeader` as a plain read-only heading; edit/delete buttons have been removed from the header and moved to the sidebar context menu.

**Sidebar context menu (ChatGPT-style):**
- Each session row in `SessionList` shows a three-dot menu button on hover (or when the menu is open).
- Menu has two items: "Renombrar" (opens `RenameSessionDialog`) and "Eliminar" (opens `DeleteSessionDialog`).
- Both dialogs apply optimistic local mutations immediately, then call `router.refresh()` to reconcile the server state.
- On delete of the currently-open session: redirect to next most-recent session, or to `?new=1` if none remain.
- On delete of a non-open session: remove from list without navigation.

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
- `POST /api/chat` (when `sessionId` is absent) calls this RPC instead of the traditional INSERT.
- The RPC uses `pg_advisory_xact_lock(hashtext(student_id || ':' || course_id)::bigint)` to serialize concurrent create requests for the same (student, course) pair, preventing race conditions. The lock is held for the duration of the transaction and automatically released afterward.
- Returns `{ error: 'session_limit_reached' }` if the student already has 3 active (non-soft-deleted) sessions for that course. On 409, `ChatBox` shows the error and **preserves the typed message** so the student does not lose their input.
- Returns `{ success: true, session_id: <uuid> }` on success.
- The UI (`SessionActions` component, receiving `sessionCount` as a prop from the layout) displays a warning and disables the "Nuevo chat" button when the student has 3 active sessions.

### Chat API error handling & resilience

**Provider failure (AI generation errors):**
- If the AI provider fails (network error, timeout, HTTP 4xx/5xx, malformed response), the route catches the exception and returns 502 `ai_provider_error` with a safe client message.
- **Intentional design:** User message is persisted to the database **before** calling the provider. If the provider fails, the student's message remains in chat history but no assistant message is inserted. This preserves history integrity and ensures user input is never lost.
- No silent fallback from real providers (e.g., `nvidia-nim`) to mock on failure — errors propagate and are visible to the student.

**Context download failure:**
- If compiled course material cannot be downloaded from Supabase Storage, the route returns 500 `context_download_failed` with a generic message.
- Error messages from storage are **not** returned to client (prevents leaking internal paths or storage details).

**Session limit reached:**
- If a student tries to create a 4th active session for a course, the RPC atomically prevents it and returns 409 `session_limit_reached`.
- Client-side: `ChatBox` shows the error and **preserves the typed message** so the student does not lose input.

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
        layout.tsx      server-fetches session list, passes as props to SessionList and SessionActions
        page.tsx        ?new=1 → compose state; no sessions → compose state; sessions → redirect to most-recent by last_message_at DESC
        compose-state.tsx  compose UI (title placeholder + ChatBox in create mode)
        session-list.tsx   client component; accepts sessions prop; three-dot context menu (rename/delete)
        session-actions.tsx client component; accepts sessionCount prop; "Nuevo chat" navigates to ?new=1
        delete-session-dialog.tsx modal; POST { action:"delete" }; optimistic remove + router.refresh()
        rename-session-dialog.tsx modal; POST { title }; optimistic update + router.refresh()
        [sessionId]/
          page.tsx      session view; passes sessionId to ChatBox
          session-header.tsx  read-only title display (edit/delete buttons removed; interactions in sidebar)
  tutor/     layout guards role=tutor; students/[studentId]/courses/[courseId]/survey manages optional enrichment
  admin/     layout guards role=admin; dashboard manages accounts, courses, assignments, update requests
  api/       route handlers grouped by domain: auth, chat, files, surveys, admin, tutor, profile
    student/onboarding/ POST: saves student's 8 answers + generated personalization profile
    chat/               
      route.ts          POST: send message (optional sessionId; enforces max-3 active sessions via RPC; auto-generates title from first message)
      sessions/
        route.ts        GET: list active sessions per course (POST removed — lazy create only)
        [sessionId]/route.ts (POST: { title } to rename; POST: { action: "delete" } to soft-delete; no HTTP DELETE method)
```

### Chat security & data isolation (Phases A + B)

**Authentication & authorization:**
- `POST /api/chat` uses `requireApprovedApiUser()` — authenticated students only
- Conversation history is fetched only after session ownership is confirmed via `getStudentSessionAccessContext()`
- Course context retrieval uses only the validated `student_id` and `course_id` from the session context
- Students can only send messages to sessions they own; cross-session access returns 404

**History scoping (Phase A):**
- Conversation history is strict scoped by `sessionId`; no cross-session bleed possible
- History includes only `role IN ('user', 'assistant')`; system messages are not stored/retrieved
- History window: most recent 10 messages; older messages never sent to provider
- History fetch failure is non-fatal; chat continues with empty history (graceful degradation)

**Course context retrieval (Phase B):**
- Retrieved sections come only from the compiled markdown for the validated student+course pair
- No full compiled blob is passed to any provider; only relevant top-4 sections (max 6000 chars)
- Retrieved section scores are computed server-side; scores and raw retrieval metadata never exposed to client
- Hard refusal (no sections found) is deterministic; refusal text is a compile-time constant, not interpolated

**Message persistence:**
- User messages are persisted before any AI call or retrieval attempt (ensures input is never lost)
- Refusal messages (Phase B) are persisted only if no relevant sections found
- Assistant messages are persisted after provider call succeeds
- All three paths include explicit error checking; insert failures return 500 with generic message
- If insert fails, the client is informed of the error (not silently dropped)

**Response body structure:**
- Client receives only `{ success: true/false, sessionId, assistantMessage }` and error codes
- No history is returned; no retrieval scores; no course sections; no internal metadata
- Error messages are safe (no stack traces, storage paths, or provider details leaked)

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

### Chat testing & validation (manual checklist)

Before deploying Phases A + B to production:
- [ ] **In-scope question:** Message with clear course terminology triggers retrieval, sections found, provider called, answer grounded in retrieved sections
- [ ] **Out-of-scope question:** Message about topic not in course (e.g., AWS in Finance course) returns zero sections, provider NOT called, fixed refusal returned 200 with `success: true`
- [ ] **Short follow-up:** Message like "¿Y entonces?" triggers continuation bypass, provider called despite short message, conversation flows naturally
- [ ] **New session (Phase A):** Create new session, send first message, history is empty, session created successfully
- [ ] **Existing session (Phase A):** Send message in established session, history includes prior messages, conversation context is maintained
- [ ] **History length:** Verify history window is max 10 messages; older messages never sent to provider
- [ ] **Max 3 sessions:** Attempt to create 4th session returns 409, message preserved, subsequent sessions still work
- [ ] **Mock provider:** `AI_PROVIDER=mock` works, response synthesized, history count logged, no raw context leaked
- [ ] **NVIDIA NIM provider:** `AI_PROVIDER=nvidia-nim` works, REGLA ABSOLUTA in system prompt, history in messages array, retrieved sections in context
- [ ] **Cross-session IDOR:** POST `/api/chat` with `sessionId` from another course/student returns 404
- [ ] **Auth failure:** Non-student role returns 403; incomplete personalization returns 403; unauthenticated returns 401
- [ ] **Message persistence:** User message saved; provider failure (502) does not erase user message; refusal (200) has assistant message saved
- [ ] **Error responses:** No retrieval scores, no storage paths, no raw sections in error messages; only `success`, `sessionId`, `assistantMessage`, and error codes

Run: `npm run lint && npm run build`

### Known limitations & future work

**Phase A (Conversation Memory):**
- No session search/filtering yet; students must scroll session list to find old sessions
- History is fetched fresh on each request; no caching layer between requests in same session
- 10-message window is fixed; no user preference to adjust history depth

**Phase B (Course-Scope Retrieval & Hard Refusal):**
- Keyword/token overlap is simple cosine-like scoring; no semantic understanding
- Threshold (0.08) and top-K (4) are hardcoded; may need tuning based on real-course results
- No deduplication of similar sections; continuation chunks can dominate top-K results
- Hard refusal is deterministic (Phase B Layer 1); no fall-through to general knowledge (intentional)
- Future optional Layer 2: backend validation gate to catch edge cases where REGLA ABSOLUTA is violated by provider

**Phase C (Semantic RAG — planned, not yet implemented):**
- Requires PostgreSQL `pgvector` extension
- Requires embedding model and schema migration (`embeddings` column on sections)
- At compile time: extract sections and embed them once
- At query time: embed current query and use cosine similarity for ranking
- Better relevance than token overlap; more resilient to paraphrasing
- Timeline: Phase C roadmapped after Phase A + B validated in production (2026 Q2 likely)

**Rate limiting:**
- Authenticated students can currently drive AI provider cost via repeated `POST /api/chat` requests
- No per-student rate limit yet; future: add sliding-window rate limit (e.g., 10 messages/minute per student)
- Prevents abuse by malicious accounts; protects NVIDIA NIM quota

**Retrieval quality monitoring:**
- Threshold (0.08), top-K (4), and character budget (6000) are based on initial testing
- No analytics on refusal rate, section relevance, or student satisfaction
- Future: log retrieval metadata (scores, sections returned, refusal vs. found) for analysis
- May inform threshold tuning or help identify courses with poor section quality

**Styling:**

Tailwind CSS v4 (PostCSS). Design tokens are inline — primary blue `#2E6F87`, background `#F7F5F0`, text `#1C2E36`. No CSS variables or design system file.
