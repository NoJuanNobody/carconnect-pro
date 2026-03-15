# ADR-002: SQLite for Local Data Storage

> **Status:** Accepted
> **Date:** 2026-01-15
> **Deciders:** Architecture Team
> **Version:** 1.0.0

## Context

CarConnect Pro needs persistent local storage for user profiles, navigation history, audio presets, and system configuration. The storage solution must work reliably in an automotive environment with potential power loss scenarios.

## Decision

We will use **SQLite** (via better-sqlite3) as the primary local data storage engine.

## Rationale

### Considered Alternatives

| Option | Pros | Cons |
|--------|------|------|
| SQLite | Zero-config, ACID, file-based, crash-safe | Single-writer, limited concurrency |
| LevelDB | Fast writes, compact | No SQL, limited query flexibility |
| PostgreSQL | Full RDBMS, high concurrency | Heavy for embedded, requires daemon |
| JSON files | Simple | No ACID, corruption risk on power loss |

### Decision Drivers

1. **Zero-configuration** - no separate database process
2. **ACID compliance** - data integrity on power loss
3. **WAL mode** - concurrent reads during writes
4. **File-based** - easy backup and factory reset
5. **better-sqlite3** - synchronous API, no callback complexity
6. **In-memory mode** - fast test execution

## Consequences

- Database access through model classes only (no direct SQL in services)
- WAL mode enabled by default for write performance
- Database file included in backup/restore procedures
- In-memory SQLite used in all tests for isolation and speed
- Migration system needed for schema updates across OTA versions
