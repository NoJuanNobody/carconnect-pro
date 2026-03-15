# CarConnect Pro - Coding Standards

## Stack
- Node.js 20+, Express, better-sqlite3, Joi validation, Winston logging
- Tests: Jest + Supertest

## Conventions
- Use `const` by default, `let` only when reassignment is needed
- Single quotes, trailing commas, 2-space indent, semicolons
- All modules use CommonJS (`require`/`module.exports`)
- File naming: kebab-case (e.g., `audio-service.js`)
- Class naming: PascalCase; variables/functions: camelCase
- Every service/model must have corresponding unit tests
- API routes must have integration tests with Supertest
- Use Joi for request validation in middleware
- Use Winston logger (never bare `console.log`)
- Database access goes through model classes only
- All IDs use UUID v4

## Directory Structure
- `src/models/` — data models and DB access
- `src/services/` — business logic
- `src/controllers/` — request handlers
- `src/api/routes/` — Express route definitions
- `src/middleware/` — Express middleware
- `src/hardware/` — hardware interface modules
- `src/hal/` — hardware abstraction layer
- `src/drivers/` — device drivers
- `src/platform/` — platform-specific code
- `src/safety/` — safety-critical modules
- `src/recovery/` — fault recovery
- `src/health/` — health checks
- `src/watchdog/` — watchdog timers
- `src/monitoring/` — performance monitoring
- `src/utils/` — shared utilities
- `src/integrations/` — external API integrations
- `src/database/` — migrations and schemas
- `docs/` — documentation
- `tests/` — all tests (unit, integration, performance, fault-tolerance)
- `scripts/` — utility scripts

## Testing
- Run all: `npm test`
- Tests must be self-contained and not depend on external services
- Use in-memory SQLite for test databases
