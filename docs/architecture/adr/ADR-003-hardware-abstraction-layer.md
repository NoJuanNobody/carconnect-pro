# ADR-003: Hardware Abstraction Layer (HAL) Design

> **Status:** Accepted
> **Date:** 2026-01-20
> **Deciders:** Architecture Team
> **Version:** 1.0.0

## Context

CarConnect Pro must support multiple hardware platforms (NXP i.MX8, Qualcomm SA8155P, TI J721E, Renesas R-Car H3). Hardware-specific code must be isolated from business logic to enable portability and testability.

## Decision

We will implement a **Hardware Abstraction Layer (HAL)** in `src/hal/` that provides platform-agnostic interfaces for all hardware components.

## Rationale

### Design

```
  Service Layer (platform-agnostic)
         |
  +------+------+
  | HAL Interface |  <-- Defined in src/hal/
  +------+------+
         |
  +------+------+
  | Driver Impl  |  <-- Defined in src/drivers/
  +------+------+
         |
     Hardware
```

### Decision Drivers

1. **Portability** - same application code runs on all target platforms
2. **Testability** - mock HAL implementations for unit testing without hardware
3. **Maintainability** - hardware changes isolated to driver layer
4. **Separation of concerns** - business logic never directly accesses hardware

### HAL Interfaces

| Interface | Methods | Hardware |
|-----------|---------|----------|
| CANInterface | open(), close(), read(), write(), setFilter() | CAN Bus |
| GPSInterface | open(), close(), getPosition(), getVelocity() | GPS Module |
| AudioInterface | init(), play(), pause(), setVolume(), setEQ() | Audio DSP |
| DisplayInterface | init(), render(), setBrightness() | Touchscreen |
| StorageInterface | read(), write(), getInfo(), format() | eMMC/eUFS |

## Consequences

- Every hardware interaction goes through HAL interfaces
- New platform support requires only new driver implementations
- Test suites use mock HAL implementations
- Performance overhead is minimal (one virtual dispatch per call)
- Driver selection is configuration-driven, not compile-time
