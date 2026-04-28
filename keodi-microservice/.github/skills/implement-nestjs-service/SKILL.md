---
name: implement-nestjs-service
description: Implement backend changes in api-gateway/auth-service/core-service/notification-service using current NestJS + Kafka + Prisma conventions.
---

# Purpose

Use this skill when implementing changes in NestJS services in this repository.

# Service model

- `api-gateway`: HTTP + Swagger + Kafka orchestration
- `auth-service`, `core-service`, `notification-service`: Kafka message/event handlers

# Implementation rules

## 1. Place code correctly

- feature logic in `src/modules/<feature>`
- infrastructure integration in `src/providers`
- shared contracts/utilities in `src/shared`
- for clean code, do not define reusable `constant`, `enum`, `interface`, or `type` directly inside feature files
- place these shared artifacts in `src/shared` using the matching folder:
	- `src/shared/constants`
	- `src/shared/enums`
	- `src/shared/interfaces`
	- `src/shared/types`

## 2. Keep boundaries clear

- controllers/handlers: transport mapping only
- services: business logic and orchestration
- database access: directly in services via `PrismaService`

## 3. Contracts and docs

- update DTOs/constants when payload contracts change
- if payload contracts add or change reusable enums/interfaces/types, update them in the matching `src/shared/*` folder
- update Kafka topic contracts on both producer and consumer sides
- update Swagger only when `api-gateway` endpoint contracts change

## 4. Schema changes

When schema changes are required:

- update `src/database/prisma/schema.prisma` in the target service
- update/add matching migrations

## 5. No-test policy

Do not add unit/e2e/Hurl tests.

# Suggested implementation flow

1. confirm target service and module ownership
2. implement transport mapping + service logic
3. apply Prisma query/schema changes if needed
4. update DTO/topic contract artifacts
5. update Swagger for gateway endpoints when needed
6. update task checklist and notes
