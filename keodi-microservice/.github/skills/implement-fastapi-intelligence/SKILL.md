---
name: implement-fastapi-intelligence
description: Implement intelligence-service changes using FastAPI lifecycle, Kafka routing, service workflows, and repository-based Prisma data access.
---

# Purpose

Use this skill for work inside `intelligence-service`.

# Architecture summary

- app bootstrap: `app/main.py`
- kafka transport: `app/kafka`
- business workflows: `app/services`
- data access: `app/repositories`
- db client/config: `app/database`, `app/config`

# Implementation rules

## 1. Lifecycle and transport

- keep startup/shutdown logic in FastAPI lifespan
- keep Kafka routing/envelope logic in `app/kafka`
- keep handlers thin and orchestration-focused

## 2. Business and data boundaries

- place reusable business logic in `app/services`
- place Prisma data access in `app/repositories`
- use existing `get_*` factory/singleton patterns for dependencies

## 3. Contract handling

- keep topic names and payload shapes explicit
- when payload shape changes, update producer and consumer paths together
- keep response/error envelope behavior consistent with kafka decorators

## 4. Schema changes

When DB schema changes:

- update `app/database/schema.prisma`
- update related repository methods

## 5. No-test policy

Do not add unit/e2e/Hurl tests.

# Suggested implementation flow

1. locate impacted handler/service/repository layers
2. implement service workflow updates
3. update repository and schema usage
4. ensure kafka response/error paths still consistent
5. update task checklist and docs notes
