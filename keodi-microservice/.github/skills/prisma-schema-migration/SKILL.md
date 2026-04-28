---
name: prisma-schema-migration
description: Apply Prisma schema and migration updates safely for NestJS and FastAPI services in this repository.
---

# Purpose

Use this skill when a task changes relational database schema.

# Supported schema locations

NestJS services:

- `auth-service/src/database/prisma/schema.prisma`
- `core-service/src/database/prisma/schema.prisma`
- `notification-service/src/database/prisma/schema.prisma`

FastAPI service:

- `intelligence-service/app/database/schema.prisma`

# Migration locations

NestJS services:

- `src/database/prisma/migrations/**`

FastAPI service:

- follow the service's established Prisma migration workflow and keep schema/client usage consistent

# Pay Attention

- `core-service` and `intelligence-service` share the same database, so both services must use the same schema. However, migrations are only allowed to be performed by the `core-service`.
- `auth-service` and ``notification-service` also share the same database, so both services must use the same schema. However, migrations are only allowed to be performed by the `auth-service`.

# Rules

- do not change schema without handling migration artifacts
- keep model and query updates synchronized
- update impacted service/repository methods in the same change
- avoid cross-service schema assumptions

# Implementation checklist

1. identify target service and schema file
2. apply minimal schema change
3. update migration artifacts for that service
4. update Prisma usage in service/repository layer
5. verify topic/API contract fields impacted by schema are updated
6. document migration impact in task notes

# No-test policy

Do not add test scaffolding or test files as part of migration work.
