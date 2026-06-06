---
name: studdy-buddy-regression-qa
description: Use after Studdy Buddy implementation changes to run validation, grep checks, lint/build checks, and manual regression scenarios.
---

# Studdy Buddy Regression QA Skill

## Purpose

Catch regressions after implementation changes.

## When to use

Use this skill after:

- new features;
- bugfixes;
- refactors;
- auth changes;
- DB changes;
- AI changes;
- file pipeline changes;
- release preparation.

## Required commands

Run when practical:

```bash
npm run lint
npm run build
```

Run these grep checks:

```bash
grep -RIn "full_name\|fullName" app lib components
grep -RIn "getStudentCourseAccessContext\|getStudentFileAccessContext\|canAccessStudentCourse" app lib
grep -RIn 'from("courses")' app lib components
```

## Regression checklist

```txt
- No profiles.full_name usage reintroduced.
- Auth helpers are still used.
- Course soft delete is preserved.
- Normal course queries filter deleted_at IS NULL.
- Student course access remains guarded.
- Student file access remains guarded.
- Tutor/student/course access remains guarded.
- Chat access remains guarded.
- Deleted/inaccessible private resources do not leak existence.
```

## Manual QA scenarios

Select scenarios based on changed files:

```txt
- Student dashboard loads assigned courses.
- Student cannot open unassigned course.
- Student can upload valid file to assigned course.
- Student cannot access another student's file.
- Tutor sees only assigned students/courses.
- Admin dashboard remains admin-only.
- Soft-deleted course disappears from normal flows.
- Chat requires active assignment, active skill, and completed context.
- Survey promotion still enforces one active skill.
```

## Output format

```md
# Regression QA Report

## Changed files

## Affected flows

## Commands run

## Grep checks

## Manual QA checklist

## Issues found

## Pass/fail recommendation
```

## Must not

- Do not approve if build fails.
- Do not approve if auth bypass is found.
- Do not ignore security-sensitive changes.
