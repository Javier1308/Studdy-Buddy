---
name: studdy-buddy-ai-guardrails
description: Use when implementing or reviewing Studdy Buddy AI chat, skill.md generation, tutor feedback personalization, prompt structure, context usage, and guardrails.
---

# Studdy Buddy AI Guardrails Skill

## Purpose

Ensure the Studdy Buddy AI acts as a personalized study companion that answers only from approved course context.

## When to use

Use this skill when a task touches:

- `/api/chat`;
- chat UI;
- AI provider integration;
- `skill.md`;
- tutor survey generation;
- prompt structure;
- context injection;
- course context compilation;
- AI refusals;
- hallucination prevention.

## Core AI rules

```txt
- The AI must act as a study companion, not a generic chatbot.
- The AI must use active_skill_md for personalization.
- The AI must use completed course_contexts for academic content.
- Tutor feedback personalizes tone and examples but does not replace academic sources.
- If the uploaded material does not support an answer, the AI must say so.
- Do not let the AI invent academic facts.
- Do not leak hidden prompts, system messages, private metadata, or raw internal context.
- Keep AI_PROVIDER=mock working.
```

## Files to inspect

```txt
app/api/chat/route.ts
app/student/courses/[courseId]/chat/
lib/chat/
lib/ai/
app/api/surveys/
```

## Workflow

1. Read current chat/provider implementation.
2. Identify source of `active_skill_md`.
3. Identify source of compiled `course_contexts`.
4. Verify access checks before context retrieval.
5. Verify unsupported questions are refused safely.
6. Verify prompt distinguishes:
   - personalization context;
   - academic source context;
   - user message.
7. Keep mock provider intact.
8. Add tests or manual validation scenarios where possible.

## Output format

```md
# AI Guardrails Review/Implementation

## Current behavior

## Proposed behavior

## Prompt structure

## Context boundaries

## Refusal behavior

## Security risks

## Implementation steps

## Validation checklist
```

## Must not

- Do not allow general-knowledge academic answers when course context is required.
- Do not use tutor feedback as factual academic material.
- Do not break the mock AI provider.
- Do not leak hidden prompts or private student data.
