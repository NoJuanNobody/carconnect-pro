# ADR-001: Node.js as Application Runtime

> **Status:** Accepted
> **Date:** 2026-01-15
> **Deciders:** Architecture Team
> **Version:** 1.0.0

## Context

CarConnect Pro requires a runtime environment for the infotainment application layer that supports rapid development, good I/O performance for hardware communication, and a rich ecosystem for web-based UI and API development.

## Decision

We will use **Node.js 20+** as the primary application runtime for CarConnect Pro.

## Rationale

### Considered Alternatives

| Option | Pros | Cons |
|--------|------|------|
| Node.js | Event-driven I/O, large ecosystem, fast development | Single-threaded CPU, GC pauses |
| C++ | Maximum performance, deterministic | Slow development, memory safety risks |
| Rust | Memory safety, performance | Smaller ecosystem, steeper learning curve |
| Python | Rapid prototyping | Poor performance for real-time tasks |

### Decision Drivers

1. **Event-driven architecture** aligns with automotive event handling (CAN messages, GPS updates, user input)
2. **Non-blocking I/O** suitable for concurrent hardware communication
3. **Express ecosystem** provides mature HTTP server capabilities
4. **better-sqlite3** offers synchronous SQLite access without callback complexity
5. **Jest testing framework** enables comprehensive testing
6. **Developer availability** - larger talent pool than embedded-specific languages

### Tradeoffs

- CPU-intensive operations (audio DSP) may need native addons or offloading to hardware
- Garbage collection pauses mitigated by tuning V8 heap settings
- Not suitable for safety-critical real-time (ASIL-rated) components

## Consequences

- All application code written in JavaScript (CommonJS modules)
- Native addons used for performance-critical hardware interfaces
- Watchdog timers monitor for GC-related delays
- Safety-critical components remain in C/C++ below the HAL layer
