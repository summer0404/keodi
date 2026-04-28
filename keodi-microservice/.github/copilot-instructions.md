# Copilot Instructions

This repository is a multi-service backend system with two technology stacks:

- NestJS microservices: `api-gateway`, `auth-service`, `core-service`, `notification-service`
- FastAPI service: `intelligence-service`

All generated code and documentation must follow the rules in `.github/instructions`. Those files are the implementation source of truth.

## Service snapshot

- `api-gateway`: public HTTP API, Swagger docs, JWT guards, and Kafka request/response orchestration.
- `auth-service`, `core-service`, `notification-service`: Kafka-first NestJS microservices using `@MessagePattern` and `@EventPattern`.
- `intelligence-service`: FastAPI app with lifespan-managed Kafka consumer plus ML/recommendation workflows.

## Mandatory rules

- Swagger updates are required only for `api-gateway` endpoint changes.
- In NestJS services, database access is done directly in service layer through `PrismaService`.
- In FastAPI (`intelligence-service`), database access is done through repository layer in `app/repositories`.
- Keep transport layers thin:
	- NestJS controllers map input and delegate.
	- FastAPI routes and Kafka routing code delegate business work.
- Keep Kafka topic contracts explicit and consistent across producers/consumers.
- Reuse existing providers, helpers, DTOs, constants, and service patterns before adding new abstractions.
- Do not create unit tests, e2e tests, or Hurl tests in this project.

## Required reading order

When generating or editing code, consult these files in order:

1. `.github/instructions/architecture.instructions.md`
2. `.github/instructions/project-structure.instructions.md`
3. `.github/instructions/coding-conventions.instructions.md`
4. `.github/instructions/api-response.instructions.md`
5. `.github/instructions/integrations.instructions.md`
6. `.github/instructions/documentation.instructions.md`

## Working behavior

- Before creating files, inspect the target service/module for existing patterns.
- Before changing contracts, update the related DTOs/models and transport docs in the same change.
- For API contract changes in `api-gateway`, update Swagger decorators and response DTOs together.
- For schema changes, update Prisma schema and related migration files in the same service.
- Preserve existing behavior unless the requirement explicitly asks for behavior change.
- Prefer small, focused, low-risk edits over speculative rewrites.
