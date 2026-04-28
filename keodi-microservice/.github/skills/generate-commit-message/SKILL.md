---
name: generate-commit-message
description: Generate commit messages that follow conventional style and reflect service-specific backend changes.
---

# Purpose

Use this skill when you need to:

- propose a commit message
- split a large change into multiple meaningful commits
- rewrite commit messages to clearer, conventional format

# Commit pattern

Preferred format:

```text
type(scope): short summary
```

Examples:

- `feat(api-gateway): add swagger docs for place for-you endpoint`
- `fix(core-service): handle empty search result in recommendation flow`
- `improve(notification-service): simplify dispatch channel selection`
- `refactor(intelligence-service): move ranking db calls into repository`
- `docs(github): align instructions with nest-fastapi architecture`

# Recommended types

Use the most accurate type:

- `feat`
- `fix`
- `improve`
- `refactor`
- `docs`
- `chore`
- `ci`
- `build`
- `perf`
- `revert`

# Scope guidance

Prefer real service/module scopes:

- `api-gateway`
- `auth-service`
- `core-service`
- `notification-service`
- `intelligence-service`
- or feature scope like `auth`, `place`, `recommendation`, `notification`

Avoid vague scopes like `misc`, `update`, `code`.

# Summary rules

- keep summary short and specific
- use imperative voice
- describe what changed, not how hard it was
- avoid mixing unrelated concerns in one summary

# Multi-commit rule

If the diff contains unrelated concerns, suggest a commit split by concern, for example:

1. contract changes
2. business logic changes
3. docs/instruction changes

# Output format

Return:

- recommended commit message
- optional alternatives when ambiguity exists
- optional multi-commit breakdown for broad changes
