# ADR-005: Safety and Watchdog Architecture

> **Status:** Accepted
> **Date:** 2026-02-01
> **Deciders:** Architecture Team, Safety Team
> **Version:** 1.0.0

## Context

As an automotive infotainment system, CarConnect Pro must handle hardware failures, software crashes, and degraded conditions gracefully. While not ASIL-rated, the IVI system must not interfere with safety-critical vehicle functions.

## Decision

We will implement a **multi-level watchdog and recovery architecture** with clearly defined severity levels and automated recovery procedures.

## Rationale

### Severity Levels

| Level | Description | Response | Example |
|-------|-------------|----------|---------|
| LOW | Non-critical degradation | Restart service | Audio preset load failure |
| MEDIUM | Feature unavailable | Restart + notify | GPS signal lost |
| HIGH | Multiple failures | Factory reset consideration | Database corruption |
| CRITICAL | System integrity risk | Enter safe mode | CAN bus failure |

### Watchdog Architecture

```
  Hardware Watchdog (kernel level)
         |
  Software Watchdog (application level)
         |
  +------+------+------+------+
  |      |      |      |      |
  CAN   GPS   Audio  Health  DB
  Mon   Mon   Mon    Mon     Mon
```

### Recovery Procedures

1. **Service Restart**: Individual service restart with state preservation
2. **Subsystem Reset**: Reset hardware interface and reinitialize
3. **Factory Reset**: Restore to known-good configuration (preserving user data option)
4. **Safe Mode**: Minimal functionality with maximum stability

## Consequences

- Every service must implement a health check endpoint
- Watchdog kick interval: 1 second (configurable)
- Recovery procedures tested as part of CI/CD
- Safe mode provides basic vehicle integration only (no nav/audio)
- All fault events logged with timestamps for post-incident analysis
