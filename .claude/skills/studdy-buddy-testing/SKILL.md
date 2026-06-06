---
name: studdy-buddy-testing
description: Use when adding or planning tests for Studdy Buddy, especially authorization, API, chat, file, survey, and regression tests.
---

# Studdy Buddy Testing Skill

## Purpose

Create a minimal, useful test strategy for Studdy Buddy without overengineering the MVP.

## When to use

Use this skill when a task involves:

- adding tests;
- planning tests;
- validating endpoints;
- preventing auth regressions;
- validating file/chat/survey flows;
- preparing production confidence.

## Testing priority

Prioritize tests in this order:

```txt
1. Auth guard behavior.
2. Student cannot access another student's course.
3. Student cannot access another student's file.
4. Tutor cannot access unassigned student/course.
5. Admin-only endpoints reject non-admins.
6. Soft-deleted courses do not appear in normal flows.
7. /api/chat requires active assignment, active_skill_md, and completed course_contexts.
8. Survey promotion enforces one active skill.
9. File delete uses POST and respects ownership.
10. Regression smoke tests for dashboards.
```

## Recommended approach

Start minimal:

```txt
- Use a small number of high-value tests first.
- Prefer authorization and API behavior tests over brittle styling tests.
- Add Playwright only if end-to-end browser coverage is needed.
- Add Vitest/Jest only after checking project setup.
```

## Files to inspect

```txt
package.json
app/api/
app/
lib/auth/
CLAUDE.md
```

## Workflow

1. Check whether test tooling already exists.
2. Propose minimal tooling if none exists.
3. Add test scripts only if tooling is added.
4. Create fixtures carefully.
5. Prioritize auth/security tests.
6. Document how to run tests.

## Output format

```md
# Test Plan

## Current test setup

## Recommended tooling

## Test cases

## Files to add/change

## Commands

## Risks

## Next steps
```

## Must not

- Do not add a large test stack without justification.
- Do not require paid services for basic tests.
- Do not write brittle UI-only tests as the first priority.
