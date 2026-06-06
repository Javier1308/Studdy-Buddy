---
name: studdy-buddy-file-pipeline
description: Use when implementing or reviewing Studdy Buddy file upload, extraction, preview, confirmation, deletion, and course context compilation.
---

# Studdy Buddy File Pipeline Skill

## Purpose

Maintain a secure and reliable academic material pipeline.

## When to use

Use this skill when a task touches:

- file uploads;
- file extraction;
- file preview;
- file confirmation;
- file deletion;
- Supabase Storage files;
- compiled course contexts;
- PDF/DOCX/TXT/Markdown processing.

## File pipeline rules

```txt
- Students can only upload to assigned active courses.
- Students can only access their own files.
- Use getStudentCourseAccessContext() for course upload access.
- Use getStudentFileAccessContext() for file access.
- Files with deleted_at != null must return 404.
- /api/files/[fileId]/delete currently uses POST, not DELETE.
- Confirmed extracted content should compile into course_contexts.
- Extraction failures should be visible and recoverable.
```

## Files to inspect

```txt
app/api/files/
app/student/courses/[courseId]/
lib/auth/course-access.ts
lib/supabase/
```

## Workflow

1. Identify affected file route or UI flow.
2. Verify course assignment for uploads.
3. Verify file ownership for fileId routes.
4. Verify deleted files are inaccessible.
5. Verify Storage paths are not exposed unsafely.
6. Verify extraction status transitions.
7. Verify confirmed content updates course context.
8. Run auth and regression checks.

## Output format

```md
# File Pipeline Review/Implementation

## Current behavior

## Proposed behavior

## Routes affected

## Storage impact

## DB impact

## Auth checks

## Failure states

## Validation checklist
```

## Must not

- Do not allow cross-student file access.
- Do not upload into unassigned courses.
- Do not hard-delete records unless explicitly requested.
- Do not change POST delete behavior without checking current UI usage.
