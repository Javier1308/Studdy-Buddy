# Feature Plan: Chat UX Refinement (Sidebar accuracy, lazy session creation, ChatGPT-style delete/rename)

## Summary

Refine multi-session chat UX so:
- Sidebar shows only active sessions and updates immediately after mutations (create/rename/delete).
- "Nuevo chat" enters an empty in-memory compose state instead of creating a phantom DB row.
- DB session created ONLY on first message send via existing lazy-create path.
- Empty chats cannot exist.
- Delete uses ChatGPT-style hover-X menu on sidebar rows with confirmation modal.
- Rename moved to the same sidebar context menu (three-dot or action menu).
- After deleting the open session, redirect to most-recent remaining active session or empty compose state.
- After deleting a non-open session, remove it in place without navigation.
- Use server-fetched session list (initial props) + optimistic local mutation + `router.refresh()`.
- No Supabase realtime, no schema/RLS/migration changes, no changes to onboarding/surveys/file/admin/auth flow.

**Design choices (user-confirmed):**
- Compose entry: URL-driven (`/chat?new=1`) — server-renderable, refresh-safe.
- Rename location: Move to sidebar context menu alongside delete (ChatGPT-style).

---

## Current implementation found

### Sidebar & session list (`session-list.tsx`)
- Client-only `useEffect` fetch on mount → stale after mutations.
- Renders a list of sessions as `Link` components.
- No refresh mechanism after mutations.
- Stale sessions persist until page reload or navigation.

### "Nuevo chat" button (`session-actions.tsx`)
- Calls `POST /api/chat/sessions` with `courseId` → creates an **empty DB session** with `Chat - YYYY-MM-DD` title.
- Routes to the session immediately.
- Consumes the max-3 budget even if the student never sends a message.

### Session management (`session-header.tsx`)
- Rename: in-line edit form, calls `POST /api/chat/sessions/[sessionId]` with `{ title }`.
- Delete: inline red confirmation panel, calls `POST /api/chat/sessions/[sessionId]` with `{ action: "delete" }`.
- Post-delete: always redirects to `/chat`, which redirects to most-recent or shows empty state.
- Delete UI is not ChatGPT-like (not a hover-X, not a sidebar action).

### Empty state (`page.tsx`)
- When no sessions exist, renders a simple "Crea un nuevo chat para empezar" message.
- This must become the reusable **compose state** for "create new session" flow.

### Chat send (`chat-box.tsx`)
- Always posts with `sessionId` (session already exists).
- Will need to support compose mode (no `sessionId`) for first-message lazy create.

### API routes
- `GET /api/chat/sessions` — already filters `deleted_at IS NULL`; no changes needed.
- `POST /api/chat/sessions` — **eager empty create**; should be removed or disabled.
- `POST /api/chat` — already supports lazy create (when `sessionId` is absent); is the canonical create path.
- `POST /api/chat/sessions/[sessionId]` (rename/delete) — no server changes needed; response shape supports refresh.

### Session list fetch in layout
- Currently, `SessionList` is a client component that fetches once on mount.
- Must become a **server-fetched prop** passed from `layout.tsx` to eliminate the stale-cache bug.

---

## Files likely affected

### Client components (sidebar, compose, delete/rename menu)

| File | Change | Why |
|------|--------|-----|
| `chat/layout.tsx` | Server-fetch session list once, pass to `SessionList` as initial props. Wrap with `Suspense` if needed for personalization gate check. | Make session list the source of truth; `router.refresh()` re-fetches server-side, fixing stale state. |
| `chat/page.tsx` | Handle `?new=1` query param to render empty compose state even if sessions exist. Keep redirect-to-most-recent logic for normal case. | Enable "create new session" from anywhere in the layout. |
| `chat/session-list.tsx` | Accept sessions as props (server-fetched). Add optimistic local remove/add/rename. Add hover-X delete affordance on each row. Add three-dot context menu for rename + delete. Expose a "selected session" to highlight active. | Move from client-only fetch to server-driven; add delete/rename menu. |
| `chat/session-actions.tsx` | "Nuevo chat" navigates to `/chat?new=1` instead of calling `POST /api/chat/sessions`. Keep max-3 disable. | Stop creating empty sessions. |
| `chat/[sessionId]/chat-box.tsx` | Support compose mode (no `sessionId`). On first send without `sessionId`, post to `/api/chat`, read `sessionId` from response, `router.push` + `router.refresh()`. Handle 409 limit gracefully (show error, preserve typed message). | Enable lazy-create flow. |
| `chat/[sessionId]/session-header.tsx` | Delete this file or repurpose as metadata-only. Rename + delete logic moves to sidebar context menu. Keep title display if needed. | Consolidate all session mutations (delete, rename) to sidebar menu. |

### New components

| File | Purpose |
|------|---------|
| `chat/compose-state.tsx` (or inline in `page.tsx`) | Empty compose UI reused from the empty-state in `page.tsx` + a `ChatBox` in compose mode (no `sessionId`). |
| `chat/session-menu-dialog.tsx` | Context menu for each sidebar row: rename (inline edit or modal) + delete with confirmation modal. |
| `chat/delete-session-dialog.tsx` | Confirmation modal for delete: "This will delete the session and its history cannot be recovered. Continue?" |

### API routes (minimal changes)

| File | Change | Why |
|------|--------|-----|
| `app/api/chat/sessions/route.ts` | Remove `POST` method (eager empty create) or return 405. Keep `GET`. | Enforce "empty chats cannot be created"; only lazy-create via `POST /api/chat` is allowed. |
| `app/api/chat/route.ts` | No logic change; already lazy-creates when `sessionId` absent. Ensure response includes `sessionId` for client routing. Already does this. | This becomes the sole create path. |
| `app/api/chat/sessions/[sessionId]/route.ts` | No logic change. Response format already supports list refresh. | Unchanged. |

---

## API impact

- **Removed:** `POST /api/chat/sessions` (eager empty create). The endpoint is eliminated because "empty chats cannot be created" and all creation must be lazy.
- **Unchanged:** `GET /api/chat/sessions` (list).
- **Unchanged:** `POST /api/chat` (lazy create on first message).
- **Unchanged:** `POST /api/chat/sessions/[sessionId]` (rename/delete actions).

No new endpoints. No RPC changes (the advisory-lock RPC stays).

---

## UI impact

### Sidebar session list
- Add context menu affordance (three-dot icon or right-click).
- Menu items: "Renombrar" + "Eliminar".
- Rename: inline edit field or modal (recommend modal for clarity).
- Delete: "Confirmar eliminación" modal.
- Hover styles: highlight on hover, show three-dot.
- Active state: current session highlighted (e.g., darker background).

### Compose state
- Reuse the empty-state from `page.tsx` (or a new `<ComposeChat />` component).
- Show title placeholder: "Nuevo chat".
- Empty message list or a hint: "Haz tu primera pregunta para empezar."
- Focused input, same UX as regular chat.

### Post-create behavior
- First message send in compose mode → `POST /api/chat` without `sessionId` → 201 with `sessionId` → `router.push` to session → `router.refresh()` to re-fetch list → new session appears in sidebar.
- Error on 409 limit: show error, preserve typed message (do not clear input).

### Delete behavior
- Deleting the open session: conditional redirect (most-recent remaining or compose state).
- Deleting a non-open session: in-place removal via optimistic local state.

---

## DB/RLS/Storage impact

**None.** All existing tables, RLS policies, and storage bucket policies are unchanged. The migration/RPC (advisory-lock `create_chat_session_with_limit`) is untouched.

---

## Auth/security impact

**None.** All existing ownership checks are preserved:
- `getApprovedUserOrRedirect()` — page guard.
- `requireApprovedApiUser()` — API guard.
- `getStudentSessionAccessContext()` — validates session belongs to student, course is active, session is not soft-deleted.
- `getStudentCourseAccessContext()` — validates course access.
- 404 (not 403) on access denial — no change.

Removing `POST /api/chat/sessions` does not weaken auth; it removes an entry point. The sole create path is now `POST /api/chat` with the same guards.

---

## Implementation steps (exact sequence)

### Phase 1: Backend (API routes)
1. **Remove `POST /api/chat/sessions`** from `app/api/chat/sessions/route.ts` OR replace with 405 response.
   - Keep `GET` untouched.
   - Confirm no other code calls the removed endpoint (grep for `POST /api/chat/sessions` calls).

2. **Verify `POST /api/chat` response shape** includes `sessionId` for client routing.
   - Current: `{ success: true, sessionId, assistantMessage }` ✓
   - No change needed.

### Phase 2: Frontend (server-side)
3. **Server-fetch session list in `layout.tsx`.**
   - Move the `SessionList` fetch from client `useEffect` to server-side in layout.
   - Fetch `chat_sessions` where `deleted_at IS NULL`, ordered by `last_message_at DESC`.
   - Pass sessions as props to `SessionList`.
   - Wrap with `Suspense` if needed for better UX during personalization gate check.

### Phase 3: Frontend (sidebar & menu)
4. **Refactor `SessionList` to accept sessions as props.**
   - Remove client `useEffect` fetch.
   - Accept `sessions: Session[]` prop from layout.
   - Add hover affordance (three-dot icon or hover highlight).
   - Add context menu component (three-dot menu or right-click menu).
   - Menu items: "Renombrar", "Eliminar".
   - Implement optimistic local mutation: on delete success, remove from state; on rename success, update in state.
   - Call `router.refresh()` after mutation to reconcile with server.

5. **Create `DeleteSessionDialog` component.**
   - Modal: "Esto eliminará la sesión y su historial no se podrá recuperar. ¿Continuar?"
   - Confirm button → `POST /api/chat/sessions/[sessionId]` `{ action: "delete" }`.
   - On success: optimistic remove from list + `router.refresh()` + conditional redirect (if open session, go to most-recent remaining or compose; else stay put).

6. **Create `RenameSessionDialog` component or inline edit.**
   - Modal or inline: prompt for new title (1–80 chars, trimmed server-side).
   - Confirm → `POST /api/chat/sessions/[sessionId]` `{ title }`.
   - On success: optimistic update in list + `router.refresh()`.

7. **Remove or repurpose `SessionHeader`.**
   - Delete the "Editar" and "Eliminar" buttons from the header component (session-header.tsx).
   - Keep only the title display and metadata (e.g., message count).
   - Or delete the file entirely if only used for these buttons.

### Phase 4: Frontend ("Nuevo chat" flow)
8. **Update `SessionActions` ("Nuevo chat" button).**
   - Change `handleNewSession` to navigate to `/chat?new=1` instead of calling the API.
   - Keep max-3 disable logic (based on `sessionCount`).
   - No API call on button click.

9. **Update `page.tsx` to handle `?new=1` query param.**
   - Check for `?new=1` or similar (recommend using `useSearchParams` in a client wrapper or a server query check).
   - If `?new=1`, render the compose state.
   - Else if sessions exist, redirect to most-recent.
   - Else render compose state (no active sessions).

### Phase 5: Frontend (compose mode & lazy create)
10. **Create a reusable compose component** (or adapt the empty state from `page.tsx`).
    - Render an empty thread: title placeholder "Nuevo chat", empty message list.
    - Render a `ChatBox` in compose mode (no `sessionId` prop).

11. **Update `ChatBox` to support compose mode.**
    - Check if `sessionId` is provided.
    - If not, compose mode: on send, post to `/api/chat` **without `sessionId`**.
    - Handle response: extract `sessionId`, call `router.push(`/chat/${sessionId}`)`, then `router.refresh()`.
    - On 409 limit error: show error message, **preserve typed message** (do not clear input).
    - On 403 personalization error: show error, might have been cleared between submit and now (unlikely, but log it).

### Phase 6: Frontend (delete redirect logic)
12. **Implement conditional redirect in delete handler.**
    - If deleting the currently open session: fetch the most-recent remaining active session; if found, redirect to it; else redirect to `/chat?new=1` (compose state).
    - If deleting a non-open session: just remove from list optimistically + refresh (no navigation).
    - Use `usePathname()` to detect if the deleted session is currently open.

### Phase 7: Validation
13. **Run `npm run lint` and `npm run build`.**
    - Ensure no type errors, no unused variables.

14. **Manual regression checklist:**
    - Max-3 enforcement: attempt to create 4th session on first-message send → 409 error displays, typed message preserved.
    - Soft-delete hidden: delete a session → immediately removed from sidebar, does not appear after refresh.
    - 404 on deleted: direct URL to deleted session → `notFound()` (404 page).
    - Redirect to most-recent: delete the open session with remaining sessions → redirected to most-recent.
    - Redirect to compose: delete the last remaining session while open → redirected to `/chat?new=1`.
    - No empty sessions: create new session without sending a message → browser back or page reload → session does not persist (no DB row created).
    - Delete non-open session: with another session open, delete a different session → active session stays open, deleted session removed from sidebar.
    - List refresh: rename or delete a non-open session → sidebar updates immediately without page reload.

---

## Risks

### Race conditions & state consistency
- **Stale count at limit:** compose mode count is advisory (client-side). Two concurrent compose-then-sends could both attempt creation. The RPC's advisory lock + count check is authoritative; 409 returned at send time. **Mitigation:** compose mode must gracefully handle 409 (show error, preserve message).
- **Refresh race:** optimistic remove + `router.refresh()` could momentarily re-introduce a row if the soft-delete hasn't committed before refresh fetches. **Mitigation:** await delete response before calling `router.refresh()`; keep optimistic removal in local state until refresh resolves (optimistic then confirm).

### Deleted session still accessible
- A student with a bookmarked/saved session link could navigate directly to a deleted session's URL. **Mitigation:** `getStudentSessionAccessContext()` validates `deleted_at IS NULL`, so direct access returns 404 (unchanged). This is a safety net.

### Compose mode abandonment
- Student enters compose state (`?new=1`), types a message, navigates away without sending. **Mitigation:** No draft/session persistence (consistent with onboarding no-autosave rule). In-memory only. On reload, compose state is empty again (user lost their typing, but no DB session created). This is acceptable per requirements.

### Rename/delete UI accessibility
- Hover-X and context menu must be keyboard-reachable. **Mitigation:** `ui-polish-reviewer` validates keyboard/focus/touch accessibility before release.

### Endpoint removal side-effects
- Removing `POST /api/chat/sessions` could break external or old client code. **Mitigation:** Grep shows only `SessionActions` calls it. No external consumers. Safe to remove.

### Title auto-generation
- Lazy create now always auto-generates from the first message (good). Verify no lingering eager-create paths still produce `Chat - YYYY-MM-DD`. **Mitigation:** Remove `POST /api/chat/sessions` POST entirely; confirm this path is dead.

---

## Required reviewers

1. **`auth-authorization-reviewer`** — Mandatory.
   - Task: Verify removing `POST /api/chat/sessions` and new compose flow do not weaken ownership/404 behavior. Confirm delete validates ownership before soft-delete and 404 is returned on inaccessible sessions. The sole create path is now `POST /api/chat` with existing guards.

2. **`ui-polish-reviewer`** — Mandatory.
   - Task: Validate ChatGPT-style context menu (three-dot + hover), confirm modal accessibility (keyboard, focus-visible, touch), ensure sidebar/active-state styling stays consistent with Tailwind v4 tokens, verify responsive design (mobile three-dot placement).

3. **`regression-qa`** — Mandatory.
   - Task: Run lint/build, then manual regression on max-3 limit, soft-delete hidden from list, 404 on deleted session, redirect-to-most-recent, no empty sessions created, list refresh after mutations, delete a non-open session (no unintended navigation).

4. **`documentation-maintainer`** — Mandatory.
   - Task: Update `CLAUDE.md` "Chat session management" section. Document that sessions are now lazily created on first message (not on "Nuevo chat" click), that the eager-create endpoint is removed, that the sidebar shows only active sessions and refreshes immediately, and that delete/rename are now sidebar actions.

---

## Edge cases & race conditions (detailed mitigation)

| Edge case | Risk | Mitigation |
|-----------|------|-----------|
| Two concurrent "Nuevo chat" clicks in compose mode | Both could send the first message simultaneously, attempting to create two sessions (only one should succeed per max-3 RPC). | RPC's advisory lock serializes them. Second request gets 409. Client must preserve message and show error for the 409 response. |
| Delete open session while typing a message | Input is in local state; session soft-deleted. On `router.refresh()`, redirect happens. Typed message is lost (but no DB session to delete, so only in-memory loss). | Acceptable. Consistent with no-autosave onboarding rule. Student must re-type. |
| Rename modal open, session deleted by another tab/device | Modal submits rename to a now-deleted session → 404. | Rare. Modal should show error "Session not found or deleted." Client remains in compose or redirects to `/chat?new=1`. |
| Personalization becomes null between compose and first send | Student completed onboarding, now it's reverted (unlikely but possible in dev). Compose mode was available, but 403 on send. | Chat API already checks personalization at send time. Show 403 error "Personalization incomplete" and suggest re-onboarding. |
| Page-refresh in compose mode | In-memory state lost, user returns to `/chat?new=1` with empty compose again. No DB session created because compose was never sent. | Expected. No data loss (nothing was persisted). |
| Delete a non-open session while that session is being opened in another tab | Tab A: see session in list, click it (loading). Tab B: delete the session. Tab A: session fetch returns 404 because it's soft-deleted. | `[sessionId]/page.tsx` calls `getStudentSessionAccessContext`, gets null, renders `notFound()` (404). Correct behavior. |

---

## Implementation task breakdown for fullstack-feature-builder

### Backend (1 task)
1. **Remove eager-create POST from `/api/chat/sessions/route.ts`.**
   - Delete the `POST` method entirely (or return 405).
   - Keep `GET` untouched.
   - Grep for any remaining callers of `POST /api/chat/sessions` to confirm safety.

### Server-side (1 task)
2. **Server-fetch session list in `chat/layout.tsx`.**
   - Inside `ChatLayout`, after personalization check, fetch sessions via admin client.
   - Query: `chat_sessions` where `(student_id = X, course_id = Y, deleted_at IS NULL)` ordered by `last_message_at DESC`.
   - For each session, also fetch the latest message preview (last 100 chars).
   - Pass `sessions` as a prop to `SessionList`.

### Client components (4 tasks)
3. **Refactor `SessionList` to accept server-fetched sessions and add sidebar context menu.**
   - Accept `sessions: Session[]` prop.
   - Remove client `useEffect` fetch.
   - Add hover affordance (highlight background or three-dot icon).
   - Add three-dot context menu (or right-click menu if preferred).
   - Menu actions: "Renombrar" (open modal) + "Eliminar" (open confirmation).
   - Implement optimistic local remove/rename on success, then `router.refresh()`.

4. **Create `DeleteSessionDialog` component.**
   - Modal with confirmation text.
   - Confirm button → POST delete API call.
   - On success: optimistic local remove (pass a callback to parent) + `router.refresh()`.
   - Handle redirect: if open session deleted, compute most-recent remaining and redirect (or to `/chat?new=1`).
   - If non-open session, just remove from list.

5. **Create `RenameSessionDialog` component.**
   - Modal or inline edit.
   - Input for new title (1–80 chars).
   - Confirm → POST rename API call.
   - On success: optimistic local update + `router.refresh()`.

6. **Update `SessionActions` to navigate to `/chat?new=1` and update `page.tsx` to handle `?new=1`.**
   - `SessionActions`: remove `handleNewSession` API call; instead `router.push(`/chat?new=1`)`.
   - `page.tsx`: check for `?new=1` query param (use a helper or client wrapper to read `useSearchParams`). If present, render compose state. Else, existing redirect logic (most-recent or empty state).

### Chat in compose mode (2 tasks)
7. **Create a reusable compose component or adapt empty-state.**
   - New component `<ComposeChat courseId={courseId} />` that renders: title placeholder "Nuevo chat", empty message list, and a `ChatBox` in compose mode.
   - Alternatively, inline in `page.tsx`.

8. **Update `ChatBox` to support compose mode (no `sessionId`).**
   - Check if `sessionId` prop is undefined.
   - If undefined (compose mode): on send, POST to `/api/chat` **without `sessionId`**.
   - Handle response: extract `sessionId` from response.
   - Call `router.push(`/student/courses/${courseId}/chat/${sessionId}`)`.
   - Call `router.refresh()` to re-fetch session list in layout.
   - On 409 limit: show error "Maximum 3 active sessions. Delete one to create another." **Preserve typed message** (do not clear input).
   - On 403 personalization: show error, offer link to onboarding.

### Cleanup (1 task)
9. **Remove or repurpose `SessionHeader` (delete buttons from header).**
   - Either delete `app/student/courses/[courseId]/chat/[sessionId]/session-header.tsx` entirely.
   - Or keep it for title display only (remove "Editar" and "Eliminar" buttons).
   - Update `[sessionId]/page.tsx` to not import delete/rename actions from header.

---

## Decision points for implementation

### Compose state query param vs client state
**Decision: URL-driven `/chat?new=1`.**
- **Why:** Server-renderable, survives `router.refresh()`, bookmarkable, matches Next.js App Router patterns.
- **Implementation:** Use `useSearchParams()` in a client wrapper or server-side `searchParams` prop to detect `?new=1`.

### Rename UI (modal vs inline)
**Decision: Modal (recommended) or inline edit in context menu.**
- **Why:** Modal keeps the interaction consistent with the delete confirmation modal. Inline edit in the sidebar is trickier for UX.
- **Implementation:** Three-dot menu → "Renombrar" → modal with text input → confirm.

### Redirect after deleting open session
**Decision: Redirect to most-recent remaining, or `/chat?new=1` if none.**
- **Why:** Keeps the student in an active state. Compose state is the fallback.
- **Implementation:** In delete handler, fetch remaining sessions, pick the first ordered by `last_message_at DESC`, redirect to it. If empty, redirect to `/chat?new=1`.

### Optimistic vs pessimistic UI updates
**Decision: Optimistic (remove/rename locally first, then confirm via refresh).**
- **Why:** ChatGPT-like responsiveness; `router.refresh()` ensures eventual consistency.
- **Implementation:** On delete/rename success, mutate local state immediately, then `router.refresh()`. If refresh finds the action already applied server-side, no double-remove occurs.

---

## Documentation updates required

### Update `CLAUDE.md` "Chat session management" section

**Current text to replace:**
```
**Personalization gate (early check):**
- Before allowing session creation, the API checks that `students.active_personalization_md IS NOT NULL`. If null, returns 403 `personalization_not_complete`. This prevents creation of phantom sessions for students who haven't completed onboarding.

**Auto-generated title + manual rename:**
- When creating a session via first message (`POST /api/chat` without `sessionId`), the title is auto-generated from the first ~60 characters of the user's message (truncated on a word boundary).
- Students can rename via `POST /api/chat/sessions/[sessionId]` with `{ title }` (1–80 characters, trimmed and validated server-side).
- The page header (`SessionHeader`) component shows the title with edit/rename and delete buttons.

...

**Max-3 enforcement (atomic, server-side):**
- Enforced atomically via the RPC `public.create_chat_session_with_limit(p_student_id, p_course_id, p_title)`.
- Session creation paths (`POST /api/chat/sessions` and `POST /api/chat` when `sessionId` is absent) call this RPC instead of the traditional INSERT.
```

**New text:**
```
**Session creation (lazy, on first message):**
- "Nuevo chat" button navigates to `/chat?new=1` (compose state); no DB session is created at this point.
- Students enter an empty in-memory compose state with an empty message list and focused input.
- When the student sends their first message, `POST /api/chat` (without `sessionId`) is called.
- The API atomically creates the session via RPC (enforces max-3 limit) and stores both the user's message and the assistant's reply.
- The client receives the new `sessionId`, navigates to `/student/courses/[courseId]/chat/[sessionId]`, and calls `router.refresh()` to reload the session list.
- **Empty chats cannot exist:** if a student abandons the compose state without sending a message, no DB session is created.

**Personalization gate:**
- The compose state is accessible only to students with `students.active_personalization_md IS NOT NULL` (checked in layout before rendering chat).
- First-message send also validates personalization; if it has been cleared (unlikely), returns 403 `personalization_not_complete`.

**Auto-generated title:**
- Session title is auto-generated from the first ~60 characters of the first user message (truncated on word boundary).
- Users cannot manually set a title at creation; the auto-generated title is used.

**Rename & delete (sidebar menu):**
- The sidebar displays active sessions (deleted_at IS NULL) sorted by most-recent activity (`last_message_at DESC`).
- On hover, each session row shows a three-dot context menu (or right-click).
- Menu options: "Renombrar" and "Eliminar".
- **Rename:** Opens a modal to edit the session title (1–80 characters, trimmed and validated server-side). On success, the sidebar updates immediately via optimistic local mutation and `router.refresh()`.
- **Delete:** Opens a confirmation modal. On confirm, soft-deletes the session (`deleted_at = now()`). The session is immediately removed from the sidebar. If the deleted session was the currently open one, the UI redirects to the most-recent remaining active session, or to `/chat?new=1` (compose state) if no sessions remain. If the deleted session was not open, the active session stays open and the deleted row is removed in place.

**Session list refresh:**
- The session list is fetched server-side in the layout and passed as initial props to the sidebar component.
- After any mutation (create, rename, delete), `router.refresh()` is called to re-fetch the list and ensure immediate consistency.
- No Supabase realtime; optimistic local updates provide instant feedback, server refresh ensures truth.

**Max-3 enforcement (atomic, server-side):**
- Enforced atomically via the RPC `public.create_chat_session_with_limit(p_student_id, p_course_id, p_title)`.
- Session creation happens only on first-message send (`POST /api/chat` without `sessionId`); the RPC ensures max-3 active sessions.
- If a student attempts to create a 4th session, the API returns 409 `session_limit_reached`. The client displays an error and preserves the typed message for the student to either delete a session or edit their message.
- The eager-create endpoint `POST /api/chat/sessions` has been removed.
```

**Also update the "Route structure" section to reflect the removal of the `POST /api/chat/sessions` eager-create:**

```
  api/       route handlers grouped by domain: auth, chat, files, surveys, admin, tutor, profile
    student/onboarding/ POST: saves student's 8 answers + generated personalization profile
    chat/               
      route.ts          POST: send message (sessionId optional; if absent, creates new session via RPC with max-3 limit; auto-generates title from first message)
      sessions/
        route.ts        GET: list active sessions per course; POST: [REMOVED — no longer used; all creation is lazy via POST /api/chat]
        [sessionId]/route.ts (POST: { title } for rename, or { action: "delete" } for soft-delete; no HTTP DELETE method)
```

---

## Questions before implementation

None — the plan is complete and all decisions have been confirmed by the user.

---

## Next: Exact prompt for fullstack-feature-builder

Once this plan is approved, invoke fullstack-feature-builder with:

```
Use the fullstack-feature-builder agent to implement the chat UX refinement for Study Buddy.

SCOPE (hard constraints, from approved plan):
- Sidebar shows ONLY active sessions (deleted_at IS NULL) and updates immediately after create/rename/delete.
- "Nuevo chat" must NOT create a DB session; navigate to /chat?new=1 instead.
- DB session created ONLY on first message send via POST /api/chat (lazy create, no sessionId).
- Empty chats cannot exist (no DB row created if student abandons compose state without sending).
- Remove POST /api/chat/sessions (eager empty create). Keep GET /api/chat/sessions.
- Delete UX: ChatGPT-style context menu (three-dot) on each sidebar row → confirmation modal → soft-delete. After deleting open session, redirect to most-recent remaining active session or /chat?new=1. Deleting non-open session removes it in place without navigation.
- Rename UI: also in context menu (same three-dot menu as delete).
- Compose entry: URL-driven (/chat?new=1), server-renderable, refresh-safe.
- State refresh: server-fetched session list (initial props from layout) + optimistic local mutation + router.refresh(). No Supabase realtime.
- No changes to onboarding, surveys, file pipeline, course ownership, RLS, Storage, migrations, or auth guards.

IMPLEMENTATION PLAN (from approved feature plan):
[Include the 9 task breakdown from the plan: remove POST, server-fetch, refactor SessionList, create DeleteSessionDialog, create RenameSessionDialog, update SessionActions + page.tsx, create compose component, update ChatBox, remove SessionHeader delete buttons]

FILES TO MODIFY:
- app/api/chat/sessions/route.ts (remove POST)
- app/student/courses/[courseId]/chat/layout.tsx (server-fetch sessions)
- app/student/courses/[courseId]/chat/session-list.tsx (refactor, add context menu)
- app/student/courses/[courseId]/chat/session-actions.tsx (navigate to /chat?new=1)
- app/student/courses/[courseId]/chat/page.tsx (handle ?new=1)
- app/student/courses/[courseId]/chat/chat-box.tsx (support compose mode)
- app/student/courses/[courseId]/chat/[sessionId]/session-header.tsx (remove delete buttons or delete file)

NEW COMPONENTS:
- app/student/courses/[courseId]/chat/delete-session-dialog.tsx
- app/student/courses/[courseId]/chat/rename-session-dialog.tsx (or inline in session-list context menu)
- app/student/courses/[courseId]/chat/compose-state.tsx (or inline in page.tsx)

VALIDATION:
- Run npm run lint and npm run build (no errors, no unused vars).
- Manual regression: max-3 on send, soft-delete hidden, 404 on deleted, redirect-to-most-recent, no empty sessions, list refresh, delete non-open session.
- Do not introduce any auth weakenings, RLS changes, or storage policy changes.
- Keep all existing guards (requireApprovedApiUser, getStudentSessionAccessContext, 404 on access denial).

DOCUMENTATION:
- Update CLAUDE.md "Chat session management" section (provided in plan).
- No other docs need updates.

Do not change anything beyond the scope above.

Deliver:
- All modified and new files with working code.
- Confirmation that lint/build pass.
- Brief summary of what changed and why.
```
