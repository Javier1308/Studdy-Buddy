---
name: studdy-buddy-supabase-rls-review
description: Use when reviewing Studdy Buddy Supabase schema, PostgreSQL migrations, RLS policies, indexes, constraints, or Storage bucket policies.
---

# Studdy Buddy Supabase RLS Review Skill

## Purpose

Review and improve Supabase PostgreSQL schema, RLS, indexes, constraints, and Storage policies.

## When to use

Use this skill when a task touches:

- database schema;
- migrations;
- RLS;
- Storage policies;
- uploaded files;
- course contexts;
- auth-related tables;
- access policies;
- performance indexes.

## Critical rules

```txt
- Never assume the real schema from memory.
- Use introspection SQL before making schema claims.
- Do not hard-delete courses.
- Preserve courses.deleted_at soft delete.
- Normal course queries must filter deleted_at IS NULL.
- Do not reintroduce profiles.full_name.
- Do not create destructive migrations without explicit approval.
```

## Tables to consider

```txt
profiles
students
tutors
grades
tutor_grades
courses
student_course_tutors
tutor_feedback_surveys
uploaded_files
course_contexts
chat_sessions
chat_messages
profile_update_requests
```

## Storage areas to consider

```txt
original uploaded files
extracted files/text
compiled course contexts
```

## Introspection SQL

Use these queries when schema verification is needed.

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Workflow

1. Identify affected tables or buckets.
2. Check code assumptions.
3. Ask for or run introspection SQL if needed.
4. Review constraints, indexes, and foreign keys.
5. Review RLS policies.
6. Review Storage policies.
7. Propose safe migrations.
8. Identify rollback considerations.

## Output format

```md
# Supabase Schema/RLS Review

## Schema assumptions

## Schema mismatches

## Missing constraints

## Missing indexes

## RLS status

## Storage policy status

## Migration recommendations

## Risk assessment

## Validation SQL
```

## Must not

- Do not apply destructive changes without explicit approval.
- Do not disable RLS on sensitive tables.
- Do not make Storage buckets public unless explicitly justified and approved.
