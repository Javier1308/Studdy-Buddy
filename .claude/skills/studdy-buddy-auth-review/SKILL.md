---
name: studdy-buddy-auth-review
description: Use when reviewing or implementing Studdy Buddy authentication, authorization, role checks, ownership checks, API protection, or IDOR prevention.
---

# Studdy Buddy Auth Review Skill

## Purpose

Protect Studdy Buddy against auth bypasses, role mistakes, ownership bugs, and IDOR vulnerabilities.

## When to use

Use this skill when a task touches:

- protected API routes;
- protected pages;
- role-based access;
- admin/student/tutor permissions;
- course access;
- file access;
- survey access;
- profile update requests;
- chat access;
- academic assignments.

## Required project rules

```txt
- Protected API routes must use requireApprovedApiUser().
- Protected server pages must use getApprovedUserOrRedirect() or the existing project equivalent.
- Do not replace requireApprovedApiUser() with raw supabase.auth.getUser() in protected endpoints.
- Do not trust request-provided IDs directly.
- Student course access must use getStudentCourseAccessContext().
- Student file access must use getStudentFileAccessContext().
- Tutor/student/course access must use canAccessStudentCourse().
- Return 404 for inaccessible resources where existence must be hidden.
- Do not leak whether another user's course, file, survey, or student record exists.
```

## Files to inspect

```txt
CLAUDE.md
lib/auth/
app/api/
app/admin/
app/student/
app/tutor/
app/profile/
```

## Workflow

1. Identify whether the route/page is protected.
2. Verify the correct guard is used.
3. Verify role checks.
4. Verify ownership checks.
5. Verify cross-user access is impossible.
6. Verify inaccessible private resources return 404 where appropriate.
7. Verify frontend checks are not the only protection.
8. Produce a report or apply the smallest safe fix if explicitly asked.

## Review checklist

```txt
- API route uses requireApprovedApiUser().
- Page uses approved-user guard.
- Admin-only action checks role=admin.
- Student-only action checks role=student.
- Tutor-only action checks role=tutor.
- courseId is validated through assignment.
- fileId is validated through ownership.
- surveyId is validated through tutor/student/course assignment.
- requestId is validated before approval/rejection.
- Inaccessible resources return 404 where existence should be hidden.
```

## Output format

```md
# Auth Review

## Routes/files reviewed

## Issues found

## Risk level

## Required fixes

## Suggested tests

## Pass/fail recommendation
```

## Must not

- Do not trust frontend-only checks.
- Do not expose private resource existence.
- Do not weaken approval, email verification, or role requirements.
