# ADR 0001: Course Restore Behavior — Decoupled Visibility and Assignment Status

**Date:** 2026-02-27  
**Status:** Accepted  
**Context:** Admin-only view for soft-deleted courses with restore action  
**Affected Feature:** `/app/admin/dashboard` — restore soft-deleted courses

---

## Problem

When an admin restores a soft-deleted course, should the system automatically reactivate all associated student and tutor assignments (`student_course_tutors.is_active = true`)?

Two concerns collide:
1. **Course visibility** — whether the course appears in listings (`courses.deleted_at`)
2. **Assignment status** — whether students/tutors have active access (`student_course_tutors.is_active`)

---

## Decision

**Restore sets ONLY `courses.deleted_at = null`**

**Restore does NOT automatically set `student_course_tutors.is_active = true`**

If assignment reactivation is desired, implement it as a **separate explicit admin action** with clear confirmation.

---

## Rationale

### Decoupling Concerns

The soft-delete system manages two independent states:

| Concern | Control Point | Semantics |
|---------|---------------|-----------|
| Course visibility | `courses.deleted_at` | Does this course exist in the system? |
| Assignment status | `student_course_tutors.is_active` | Do these users have active access? |

Coupling these states creates ambiguity:
- A tutor might be removed from a course with `is_active = false` (paused intentionally)
- If restore automatically reactivates, the pause is silently undone without the tutor's knowledge
- Admin loses explicit control over "restore visibility" vs. "restore access"

### Design Principle

**Explicit is better than implicit.** Restoring a course visibility should not have side effects on authorization state. The restored course should remain inaccessible until admin explicitly reactivates assignments.

### Product Consequence

- Admin restores deleted course → course appears in dashboards and normal queries
- Students/tutors with inactive assignments see no change
- To give students/tutors access again, admin must explicitly reactivate assignments (separate action)

This prevents:
- Silent authorization changes when restoring courses
- Accidental reactivation of intentionally paused students
- Confusion about whether "restore" means "restore visibility" or "restore access"

---

## Implementation

### Restore Endpoint

Single atomic operation:

```sql
UPDATE courses
SET deleted_at = NULL
WHERE id = ?
  AND user_role = 'admin'  -- auth guard
```

No cascading changes to `student_course_tutors`.

### Assignment Reactivation (Future)

If needed, implement as separate feature:

```sql
UPDATE student_course_tutors
SET is_active = TRUE
WHERE course_id = ?
  AND user_role = 'admin'  -- explicit action with confirmation
```

---

## Verification Gates

When implementing the restore feature, verify:

- [ ] Restore endpoint only modifies `courses.deleted_at`
- [ ] No automatic changes to `student_course_tutors` during restore
- [ ] Restored course immediately visible in admin course lists
- [ ] Restored course remains inaccessible to students/tutors with inactive assignments
- [ ] If assignment reactivation is proposed later, it's a separate feature with explicit confirmation UI

---

## Consequences

### Positive

✅ Explicit authorization control — admins manage visibility and access separately  
✅ No silent side effects — restore is predictable and only touches `deleted_at`  
✅ Reversible — if needed later, assignment reactivation is a separate feature  
✅ Follows principle of least surprise — restore does one thing well

### Negative

⚠️ Two-step workflow for full restoration — admin must restore course, then reactivate assignments  
⚠️ More UI/UX work if assignment reactivation is desired in the future

### Mitigation

- Clear UI messaging: "Course restored. Students/tutors remain inactive until explicitly reactivated."
- Future feature flag: Allow bulk assignment reactivation after architectural review

---

## Related Decisions

- Soft-delete pattern: `courses.deleted_at`, `uploaded_files.deleted_at` (documented in CLAUDE.md)
- Assignment deactivation: When course is deleted, `student_course_tutors.is_active = false` (existing behavior)

---

## References

- `CLAUDE.md` § Database schema — courses soft-delete pattern
- `CLAUDE.md` § Mandatory Studdy Buddy rules — "Do not hard-delete courses"
- `/app/api/admin/courses/[courseId]/route.ts` — Existing DELETE implementation

---

## Decision Record

**Proposed by:** Architecture review (orchestrator-driven)  
**Approved by:** Product team via /usage gate  
**Recorded on:** 2026-02-27  
**Next review:** When/if assignment reactivation feature is proposed
