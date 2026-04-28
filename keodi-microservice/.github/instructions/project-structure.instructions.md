# Project Structure Instructions

Place new code according to the target service layout. Do not copy folder conventions from one service into another service blindly.

## 1. Service roots

This repository has independent service roots:

- `api-gateway/`
- `auth-service/`
- `core-service/`
- `notification-service/`
- `intelligence-service/`

Keep changes inside the service you are working on unless a contract change requires coordinated updates.

## 2. NestJS service structure

For NestJS services (`api-gateway`, `auth-service`, `core-service`, `notification-service`), typical source layout is:

- `src/app.module.ts`: service composition root
- `src/main.ts`: service bootstrap and transport startup
- `src/modules`: domain features
- `src/providers`: infra/external integrations
- `src/shared`: shared DTOs, constants, enums, helpers, interfaces, types

Additionally:

- `api-gateway` contains `src/common` for guards/decorators/filters/interceptors/strategies
- service-specific Prisma setup exists where needed under `src/database` and `src/configs`

## 3. FastAPI service structure

For `intelligence-service`, source is under `app/`:

- `app/main.py`: FastAPI app + lifespan bootstrap
- `app/kafka`: consumer, producer, routing, decorators, topics
- `app/services`: business and ML workflows
- `app/repositories`: data-access layer over Prisma
- `app/database`: Prisma client and schema
- `app/config`: settings and environment parsing
- `app/common`: shared constants/helpers
- `app/prompts`: prompt-building modules

## 4. NestJS feature placement rules

Inside `src/modules/<feature>`, keep feature-local artifacts together:

- `*.module.ts`
- `*.controller.ts`
- `*.service.ts`
- optional `*.helper.ts`, `*.scheduler.ts`, `*.swagger.ts`

Rules:

- keep feature logic inside its module
- use `src/shared` only for genuinely cross-module artifacts
- use `src/providers` for integration clients, not random module files

## 5. Prisma and migration placement

NestJS services with Prisma:

- schema: `src/database/prisma/schema.prisma`
- migrations: `src/database/prisma/migrations/**`

FastAPI service:

- schema: `app/database/schema.prisma`
- client wiring: `app/database/prisma_service.py`

When changing schema, keep schema and migration artifacts synchronized in the same service.

## 6. Swagger placement policy

- Swagger/OpenAPI decorators and docs belong to `api-gateway` only.
- When practical, keep Swagger decorators extracted in `*.swagger.ts` files inside `api-gateway/src/modules/<feature>`.
- Do not add Swagger-focused files to `auth-service`, `core-service`, or `notification-service`.

## 7. FastAPI repository policy

For `intelligence-service`:

- database access should be implemented in `app/repositories`
- service logic should call repositories instead of embedding repeated DB code
- Kafka handler/bootstrap code should not become a data-access layer

## 8. Avoid these placement mistakes

Do not:

- place NestJS domain logic in `src/providers`
- place direct SDK client setup inside random feature files when a provider exists
- place transport decorators and heavy business logic in the same function
- add NestJS-style module files into FastAPI folders
- add FastAPI repository style into NestJS services where direct `PrismaService` is the established pattern

## 9. New file checklist

Before creating a new file, verify:

- file belongs to the correct service root
- folder responsibility matches file purpose
- naming pattern matches that stack (NestJS TypeScript vs FastAPI Python)
- change does not introduce duplicate abstractions
- related contract and migration files are updated when needed
