# GitHub Copilot Project Standards

This `.github` directory defines the project-specific standards used to guide GitHub Copilot and related AI workflows in this repository.

## Structure

- `copilot-instructions.md`: always-on high-level project instructions
- `instructions/`: detailed engineering standards
- `skills/`: reusable task-specific guidance
- `agents/`: role-based behavior presets

## How to use

- Read `copilot-instructions.md` first.
- Use files in `instructions/` as the source of truth for implementation rules.
- Use `skills/` when performing repeated tasks such as implementing service changes, handling migrations, writing docs, generating commit messages, or reviewing API code.
- Use `agents/` when you want AI to behave in a more specialized role such as backend developer, reviewer, or analyst/planner.

## Project expectations

Copilot-generated code should:

- follow service-specific architecture (NestJS services and FastAPI service)
- keep transport layers thin
- keep business logic in service layer
- use direct Prisma access in NestJS services
- use repository layer for Prisma access in FastAPI service
- keep response and Kafka topic contracts consistent
- update Swagger only for `api-gateway` API contract changes
- avoid creating unit/e2e/Hurl tests
