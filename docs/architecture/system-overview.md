# CarConnect Pro - System Architecture Overview

> **Version:** 1.0.0
> **Last Updated:** 2026-03-15
> **Status:** Approved
> **Author:** Architecture Team
> **Review Cycle:** Quarterly

## 1. Introduction

CarConnect Pro is a professional automotive infotainment system providing hardware integration, navigation services, audio management, and user profile management. The system is built on Node.js with Express, targeting embedded automotive platforms with real-time constraints.

### 1.1 Purpose

This document describes the high-level architecture of CarConnect Pro, including system boundaries, key components, data flows, and integration points. It serves as the primary reference for developers, architects, and stakeholders.

### 1.2 Scope

- In-vehicle infotainment (IVI) software stack
- CAN bus vehicle integration
- GPS/navigation subsystem
- Audio processing pipeline
- System health and monitoring
- OTA update and recovery mechanisms

## 2. System Context

```
+-------------------------------------------------------------+
|                     Vehicle Environment                      |
|                                                              |
|  +-----------+    +------------------+    +---------------+  |
|  | CAN Bus   |<-->| CarConnect Pro   |<-->| Audio System  |  |
|  | Network   |    | IVI Platform     |    | (DSP/Amp)     |  |
|  +-----------+    +------------------+    +---------------+  |
|                          ^    ^                              |
|                          |    |                              |
|                   +------+    +--------+                     |
|                   v                    v                     |
|           +-------------+     +----------------+             |
|           | GPS Module  |     | Display/Touch  |             |
|           +-------------+     +----------------+             |
+-------------------------------------------------------------+
                   |
                   v
         +------------------+
         | Cloud Services   |
         | (OTA, Maps, etc.)|
         +------------------+
```

## 3. Architecture Principles

| Principle | Description |
|-----------|-------------|
| **Modularity** | Each subsystem is independently deployable and testable |
| **Safety-First** | Safety-critical paths are isolated with watchdog supervision |
| **Resilience** | Graceful degradation under hardware failures |
| **Testability** | All modules designed for unit and integration testing |
| **Hardware Abstraction** | HAL layer decouples business logic from hardware specifics |

## 4. High-Level Architecture

```
+------------------------------------------------------------------+
|                        API Layer (Express)                        |
|  /api/vehicle  |  /api/navigation  |  /api/audio  |  /api/health |
+------------------------------------------------------------------+
|                     Middleware Layer                               |
|  Authentication | Validation (Joi) | Logging (Winston) | Safety  |
+------------------------------------------------------------------+
|                     Service Layer                                  |
|  VehicleService | NavigationService | AudioService | HealthService|
+------------------------------------------------------------------+
|                     Model Layer (SQLite)                           |
|  VehicleModel | NavigationModel | AudioModel | ProfileModel      |
+------------------------------------------------------------------+
|                Hardware Abstraction Layer (HAL)                    |
|  CAN Driver | GPS Driver | Audio DSP Driver | Display Driver     |
+------------------------------------------------------------------+
|                     Platform Layer                                 |
|  OS Interface | Storage | Network | Power Management             |
+------------------------------------------------------------------+
|                     Hardware                                       |
|  CAN Bus | GPS Module | Audio DSP/Amp | Touchscreen | Storage   |
+------------------------------------------------------------------+
```

## 5. Component Summary

### 5.1 API Layer
RESTful HTTP endpoints built with Express. All request validation is performed via Joi schemas in middleware before reaching controllers.

### 5.2 Service Layer
Business logic encapsulated in service classes. Services coordinate between models, hardware interfaces, and external integrations.

### 5.3 Hardware Abstraction Layer (HAL)
Provides a consistent interface to hardware components regardless of underlying platform. Enables testing with mock hardware and portability across vehicle platforms.

### 5.4 Safety and Recovery
- **Watchdog timers** monitor critical subsystems
- **Health checks** provide continuous system status
- **Recovery modules** handle fault conditions with defined procedures
- **Safety modules** enforce operational constraints

### 5.5 Data Storage
SQLite (via better-sqlite3) provides persistent storage for user profiles, navigation history, audio presets, and system configuration. In-memory mode is used for testing.

## 6. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 20+ |
| Web Framework | Express | 4.21+ |
| Database | SQLite (better-sqlite3) | 11.7+ |
| Validation | Joi | 17.13+ |
| Logging | Winston | 3.17+ |
| ID Generation | UUID v4 | 10.0+ |
| Testing | Jest + Supertest | 29.7+ / 7.0+ |

## 7. Deployment Targets

CarConnect Pro targets embedded automotive platforms with the following minimum specifications:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | ARM Cortex-A53 (quad-core) | ARM Cortex-A72 (quad-core) |
| RAM | 2 GB | 4 GB |
| Storage | 16 GB eMMC | 32 GB eUFS |
| OS | Linux 5.10+ | Linux 6.1+ |
| Temperature | -20C to +70C operating | -40C to +85C rated |

## 8. Cross-Cutting Concerns

### 8.1 Logging
All modules use Winston logger with structured JSON output. Log levels: error, warn, info, debug. Never use bare `console.log`.

### 8.2 Error Handling
Standardized error codes with categories: CAN (E-CAN-xxx), GPS (E-GPS-xxx), Audio (E-AUD-xxx), System (E-SYS-xxx). See [Error Codes Reference](../validation/error-codes.md).

### 8.3 Configuration
Environment-based configuration with sensible defaults for automotive deployment. All configuration is validated at startup.

### 8.4 Security
See [Security Architecture](security.md) for authentication, authorization, secure boot, and communication security details.

## 9. Document References

| Document | Path |
|----------|------|
| Component Diagram | [component-diagram.md](component-diagram.md) |
| Security Architecture | [security.md](security.md) |
| Scalability Guide | [scalability.md](scalability.md) |
| ADR Index | [adr/](adr/) |
| Vehicle Integration API | [../api/vehicle-integration.md](../api/vehicle-integration.md) |
| Navigation API | [../api/navigation-api.md](../api/navigation-api.md) |
| System Health API | [../api/system-health-api.md](../api/system-health-api.md) |
| Deployment Guide | [../deployment/deployment-guide.md](../deployment/deployment-guide.md) |
| Traceability Matrix | [../traceability-matrix.md](../traceability-matrix.md) |
