---
name: studdy-buddy-feature-planning
description: Use when planning Studdy Buddy features, bugfixes, refactors, UI changes, admin workflows, or documentation changes before implementation.
---

# Studdy Buddy Feature Planning Skill

## Purpose

Plan Studdy Buddy changes before implementation.

Use this skill to identify affected files, API routes, UI components, DB tables, auth risks, testing requirements, and documentation updates.

## When to use

Use this skill for:

- new features;
- bugfixes;
- refactors;
- admin dashboard changes;
- student dashboard changes;
- tutor dashboard changes;
- profile changes;
- survey changes;
- UI/UX changes;
- documentation-impacting changes.

## Files to inspect

Always inspect:

```txt
CLAUDE.md
app/
lib/
components/
```

If the task involves auth or ownership, inspect:

```txt
lib/auth/
app/api/
```

If the task involves UI, inspect:

```txt
app/
components/
```

## Workflow

1. Read `CLAUDE.md`.
2. Understand the requested change.
3. Identify affected product flow:
   - auth;
   - profile;
   - admin;
   - student;
   - tutor;
   - files;
   - surveys;
   - AI chat;
   - DB/RLS/Storage.
4. Identify affected files.
5. Identify whether DB schema or RLS may change.
6. Identify whether auth/ownership checks are required.
7. Identify testing requirements.
8. Produce a plan before modifying code.

## Output format

```md
# Feature Plan: <task>

## Summary

## Current implementation found

## Files likely affected

## API impact

## UI impact

## DB/RLS/Storage impact

## Auth/security impact

## Implementation steps

## Validation checklist

## Documentation updates

## Questions before implementation
```

## Must not

- Do not implement code unless explicitly requested.
- Do not skip auth impact analysis.
- Do not suggest replacing existing architecture without strong justification.
- Do not ignore `CLAUDE.md`.
