# Changelog

All notable changes to CarConnect Pro will be documented in this file.

This project uses [Semantic Versioning](https://semver.org/). Dates use ISO 8601 format (YYYY-MM-DD). Deployment dates are noted separately from release dates where applicable.

## Versioning Scheme

- **MAJOR**: Breaking API changes, incompatible hardware support changes
- **MINOR**: New features, backward-compatible additions
- **PATCH**: Bug fixes, documentation updates, non-breaking changes

## [Unreleased]

### Added
- System architecture documentation (system-overview.md, component-diagram.md)
- Architecture Decision Records (ADR-001 through ADR-005)
- Vehicle Integration API documentation with request/response examples
- Navigation API documentation with request/response examples
- System Health API documentation with request/response examples
- Security architecture documentation
- Scalability and extensibility guidelines
- Deployment guide with build and deployment procedures
- Rollback procedures including complete factory reset script
- Pre-production validation checklist (hardware, thermal, FCC, security)
- Automated validation pipeline documentation
- Environment compatibility matrix with storage benchmarks
- Error codes reference with recovery procedures
- Traceability matrix linking features to PRD requirements
- Documentation validation script (scripts/validate-docs.py)
- Architecture compliance test suite (tests/architecture-compliance.test.js)

### Fixed
- Vehicle integration API docs now use `vehicle_speed_kmh` parameter naming (not `speed_kmh`)
- CAN message IDs standardized to hex format (e.g., `0x0CF`)
- Documented missing error codes from v0.9.2: CAN_TIMEOUT (E-CAN-004), GPS_COLD_START (E-GPS-003), AUDIO_DSP_INIT_FAILED (E-AUD-005)
- Added recovery procedure for AUDIO_DSP_INIT_FAILED error
- Completed factory reset bash script with error handling and validation steps

## [1.0.0] - 2026-03-01

**Release Date:** 2026-03-01
**Deployment Date:** 2026-03-05
**Deployment Status:** Deployed to production

### Added
- Core infotainment platform with Node.js 20+ and Express
- Vehicle integration via CAN bus (speed, RPM, fuel, temperature, odometer)
- GPS navigation with route calculation and turn-by-turn guidance
- Audio management with DSP control and equalizer presets
- User profile management with preference storage
- System health monitoring and watchdog supervision
- RESTful API with Joi validation and Winston logging
- SQLite database with better-sqlite3 for local persistence
- Hardware Abstraction Layer (HAL) for platform portability
- Safety modules and fault recovery procedures
- A/B partition OTA update mechanism
- Secure boot chain with Ed25519 code signing

### Security
- JWT-based API authentication
- TLS 1.3 for external communications
- CAN message filtering and rate limiting
- Encrypted user data storage (AES-256-GCM)

## [0.9.2] - 2026-02-15

**Release Date:** 2026-02-15
**Deployment Date:** 2026-02-18
**Deployment Status:** Deployed (staging)

### Added
- CAN_TIMEOUT error code (E-CAN-004) for bus timeout detection
- GPS_COLD_START error code (E-GPS-003) for acquisition status reporting
- AUDIO_DSP_INIT_FAILED error code (E-AUD-005) with recovery procedure

### Fixed
- CAN bus recovery after bus-off state
- GPS cold start reporting accuracy
- Audio DSP initialization retry logic

## [0.9.1] - 2026-02-01

**Release Date:** 2026-02-01
**Deployment Date:** 2026-02-03
**Deployment Status:** Deployed (staging)

### Fixed
- Vehicle speed parameter naming standardized to `vehicle_speed_kmh`
- CAN message ID format standardized to hexadecimal (0x prefix)

### Changed
- API validation rules updated for new parameter names

## [0.9.0] - 2026-01-15

**Release Date:** 2026-01-15
**Deployment Date:** 2026-01-18
**Deployment Status:** Deployed (staging)

### Added
- Initial project scaffolding
- Express API server framework
- SQLite database setup with better-sqlite3
- Jest testing framework configuration
- ESLint and Prettier configuration
- Directory structure for all subsystems
- Basic health check endpoint

---

## Post-Deployment Entry Template

Use this template when recording post-deployment observations:

```markdown
## Post-Deployment: [Version] - [Date]

**Deployment Environment:** [staging/production]
**Deployment Date:** YYYY-MM-DD
**Deployment Completion:** YYYY-MM-DD HH:MM UTC
**Deployed By:** [Name/Team]

### Observations
- [Observation 1]
- [Observation 2]

### Metrics (First 24h)
- API response time (p99): ___ ms
- Error rate: ____%
- CPU utilization (avg): ____%
- Memory usage (avg): ___ MB

### Issues Found
- [Issue description, severity, ticket link]

### Rollback Required: [Yes/No]
- Reason: [If applicable]
- Rollback completed: [Date/Time]
```
