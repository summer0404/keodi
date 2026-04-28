# Architecture Instructions

This repository uses a mixed backend architecture:

- NestJS microservices: `api-gateway`, `auth-service`, `core-service`, `notification-service`
- FastAPI service: `intelligence-service`

Do not force one architecture style onto another service.

## 1. Architecture overview by service

### `api-gateway`

- HTTP-first NestJS application
- entrypoint in `src/main.ts` with Swagger setup
- global auth/filter concerns in `src/common`
- feature endpoints in `src/modules`
- cross-service communication via Kafka provider in `src/providers/kafka`

### `auth-service`, `core-service`, `notification-service`

- Kafka-first NestJS microservices
- entrypoint in `src/main.ts` using `createMicroservice` and Kafka transport
- handlers use `@MessagePattern` / `@EventPattern`
- business logic stays in module services
- infrastructure clients are provided from `src/providers`

### `intelligence-service`

- FastAPI application with lifespan-managed startup/shutdown
- Kafka consumer/producer and topic routing under `app/kafka`
- business/ML workflows under `app/services`
- Prisma data access through `app/repositories`

## 2. Transport layer boundaries

Transport layer includes:

- NestJS HTTP controllers (`api-gateway`)
- NestJS message/event handlers (`auth-service`, `core-service`, `notification-service`)
- FastAPI routes and Kafka routing bootstrap (`intelligence-service`)

Transport layer must:

- parse and validate inputs at boundary
- delegate business processing to service/workflow layer
- keep decorators, auth, and transport concerns local

Transport layer must not:

- hold domain workflows
- implement heavy database logic
- contain raw external SDK integration logic when provider/service abstractions already exist

## 3. NestJS business layer rules

Services are the main business layer for NestJS microservices.

Services should:

- orchestrate domain workflows
- coordinate Kafka calls, provider services, and Prisma access
- keep methods cohesive and readable

Services should not:

- become transport/decorator layers
- duplicate shared helper/provider logic

## 4. NestJS data-access rules

Current repository convention for NestJS services:

- relational database access happens directly in service layer via `PrismaService`
- do not force-create a `repository` layer for NestJS modules

Rules:

- keep query code inside the owning service
- extract private helper methods when query blocks become too long
- keep Prisma client lifecycle/configuration in `src/database`

## 5. FastAPI service and repository boundaries

`intelligence-service` uses event-driven FastAPI + Kafka workflow.

Rules:

- keep topic routing, consumer/producer plumbing, and message envelope behavior in `app/kafka`
- keep business logic in `app/services`
- keep database operations in `app/repositories`
- obtain database client via `app/database/prisma_service.py`
- avoid direct DB calls from unrelated layers when repository methods already exist

## 6. Swagger / OpenAPI policy

- Swagger documentation is required for `api-gateway` endpoint changes.
- `core-service`, `auth-service`, and `notification-service` do not require OpenAPI documentation updates.
- `intelligence-service` should keep lightweight docs behavior aligned with `app/main.py` setup and must not import NestJS Swagger patterns.

## 7. Providers and integrations

For NestJS services, `src/providers` is the integration boundary (Kafka, Redis, Google, S3, Email, FCM, etc.).

Rules:

- use provider services from module services
- keep provider registration/export in provider modules
- avoid scattering integration client setup across feature modules

For FastAPI service:

- keep Kafka integration in `app/kafka`
- keep LLM provider wiring inside dedicated service/provider modules under `app/services`

## 8. Dependency direction

NestJS direction:

- controller -> service
- service -> provider/Prisma/other services/helpers
- provider -> external SDK/infra client

FastAPI direction:

- app lifespan/bootstrap -> kafka consumer/router startup
- kafka router/handlers -> services/repositories
- repositories -> Prisma client

Avoid reverse dependency flow.

## 9. Database schema and migration rules

When schema changes are required:

- update service-specific Prisma schema (`schema.prisma`)
- update/add corresponding migration files in the same service
- do not mark work complete when schema changed but migration artifacts are missing

## 10. Cross-service contract changes

Services are isolated boundaries.

Rules:

- do not import runtime code across service roots
- communicate through Kafka topics/events and explicit payload contracts
- when changing topic payload shape, update producer and consumer sides together

## 11. Architecture completion checklist

Before completing a task, verify:

- target service architecture style is respected
- transport layer remains thin
- business logic is in service/workflow layer
- database access is in the correct layer for that stack
- Swagger is updated only when `api-gateway` API contracts changed
- schema and migration changes are both handled when relevant
- file placement and dependency direction follow existing patterns
