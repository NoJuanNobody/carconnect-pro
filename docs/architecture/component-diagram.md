# CarConnect Pro - Component Interaction Diagram

> **Version:** 1.0.0
> **Last Updated:** 2026-03-15
> **Status:** Approved

## 1. Component Overview

This document provides text-based component interaction diagrams for the CarConnect Pro infotainment system.

## 2. System Component Diagram

```
+===================================================================+
|                     CarConnect Pro IVI System                      |
+===================================================================+
|                                                                    |
|  +--------------------+     +--------------------+                 |
|  |   API Gateway      |     |   WebSocket Server |                 |
|  |   (Express)        |     |   (Real-time)      |                 |
|  +--------+-----------+     +--------+-----------+                 |
|           |                          |                             |
|           v                          v                             |
|  +----------------------------------------------------+           |
|  |              Middleware Pipeline                     |           |
|  |  [Auth] -> [Validation] -> [Logging] -> [Safety]   |           |
|  +----------------------------------------------------+           |
|           |                                                        |
|           v                                                        |
|  +-------------+ +-------------+ +-----------+ +-------------+    |
|  | Vehicle     | | Navigation  | | Audio     | | Health      |    |
|  | Controller  | | Controller  | | Controller| | Controller  |    |
|  +------+------+ +------+------+ +-----+-----+ +------+------+   |
|         |               |              |               |           |
|         v               v              v               v           |
|  +-------------+ +-------------+ +-----------+ +-------------+    |
|  | Vehicle     | | Navigation  | | Audio     | | Health      |    |
|  | Service     | | Service     | | Service   | | Service     |    |
|  +------+------+ +------+------+ +-----+-----+ +------+------+   |
|         |               |              |               |           |
|    +----+----+     +----+----+    +----+----+    +----+----+      |
|    v         v     v         v    v         v    v         v      |
| +------+ +-----+ +------+ +---+ +------+ +---+ +------+ +-----+ |
| |Vehicle| |CAN  | |Nav   | |GPS| |Audio | |DSP| |System| |Watch| |
| |Model  | |Drvr | |Model | |Drv| |Model | |Drv| |Model | |dog  | |
| +------+ +-----+ +------+ +---+ +------+ +---+ +------+ +-----+ |
|    |       |         |       |      |       |      |        |     |
+===================================================================+
     |       |         |       |      |       |      |        |
     v       v         v       v      v       v      v        v
  +------+ +--------+ +-----+ +---+ +------+ +---+ +------+ +----+
  |SQLite| |CAN Bus | |SQLite| |GPS| |SQLite| |DSP| |SQLite| |HW  |
  |  DB  | |Network | |  DB  | |HW | |  DB  | |HW | |  DB  | |Tmrs|
  +------+ +--------+ +-----+ +---+ +------+ +---+ +------+ +----+
```

## 3. Request Flow: Vehicle Speed Query

```
  Client                API         Middleware      Controller      Service        HAL/Driver
    |                    |              |              |              |              |
    |  GET /api/vehicle  |              |              |              |              |
    |  /speed            |              |              |              |              |
    |------------------->|              |              |              |              |
    |                    |  validate()  |              |              |              |
    |                    |------------->|              |              |              |
    |                    |              |  route()     |              |              |
    |                    |              |------------->|              |              |
    |                    |              |              | getSpeed()   |              |
    |                    |              |              |------------->|              |
    |                    |              |              |              | readCAN()    |
    |                    |              |              |              |------------->|
    |                    |              |              |              |   CAN frame  |
    |                    |              |              |              |<-------------|
    |                    |              |              |  speed_data  |              |
    |                    |              |              |<-------------|              |
    |                    |              |  JSON resp   |              |              |
    |                    |              |<-------------|              |              |
    |   200 OK           |              |              |              |              |
    |   {vehicle_speed_  |              |              |              |              |
    |    kmh: 60}        |              |              |              |              |
    |<-------------------|              |              |              |              |
```

## 4. CAN Bus Message Flow

```
  CAN Bus         CAN Driver        Vehicle Service       Database
    |                  |                   |                   |
    | CAN Frame        |                   |                   |
    | ID: 0x0CF        |                   |                   |
    | DLC: 8           |                   |                   |
    |----------------->|                   |                   |
    |                  | parse(frame)      |                   |
    |                  |------------------>|                   |
    |                  |                   | validate()        |
    |                  |                   |--------+          |
    |                  |                   |<-------+          |
    |                  |                   |                   |
    |                  |                   | store(telemetry)  |
    |                  |                   |------------------>|
    |                  |                   |       OK          |
    |                  |                   |<------------------|
    |                  |                   |                   |
    |                  |                   | emit('speed',     |
    |                  |                   |  vehicle_speed_   |
    |                  |                   |  kmh)             |
    |                  |                   |--------+          |
    |                  |                   |<-------+          |
```

## 5. Health Check Flow

```
  Health Service       Vehicle        Navigation      Audio          Watchdog
       |                 |                |              |              |
       | checkAll()      |                |              |              |
       |--------+        |                |              |              |
       |        |        |                |              |              |
       | ping() |        |                |              |              |
       |---------------->|                |              |              |
       |     OK/FAIL     |                |              |              |
       |<----------------|                |              |              |
       |                                  |              |              |
       | ping()                           |              |              |
       |--------------------------------->|              |              |
       |            OK/FAIL               |              |              |
       |<---------------------------------|              |              |
       |                                                 |              |
       | ping()                                          |              |
       |------------------------------------------------>|              |
       |                    OK/FAIL                      |              |
       |<------------------------------------------------|              |
       |                                                                |
       | reportStatus(results)                                          |
       |--------------------------------------------------------------->|
       |                                                                |
       | resetTimer()                                                   |
       |--------------------------------------------------------------->|
       |                                                                |
```

## 6. Audio DSP Pipeline

```
  Audio Source  ->  Decoder  ->  DSP Engine  ->  Mixer  ->  Amplifier  ->  Speakers
                                    |
                              +-----+-----+
                              |           |
                          Equalizer   Volume
                          Control     Control
                              |           |
                              +-----+-----+
                                    |
                              User Presets
                              (SQLite DB)
```

## 7. Recovery and Fault Handling

```
  Watchdog Timer         Recovery Module         System Services
       |                       |                       |
       | timeout_detected      |                       |
       |---------------------->|                       |
       |                       | assess_severity()     |
       |                       |--------+              |
       |                       |<-------+              |
       |                       |                       |
       |                       |  [SEVERITY: LOW]      |
       |                       |  restart_service()    |
       |                       |---------------------->|
       |                       |       OK              |
       |                       |<----------------------|
       |                       |                       |
       |                       |  [SEVERITY: HIGH]     |
       |                       |  factory_reset()      |
       |                       |--------+              |
       |                       |<-------+              |
       |                       |                       |
       |                       |  [SEVERITY: CRITICAL] |
       |                       |  safe_mode()          |
       |                       |---------------------->|
       |                       |                       |
```

## 8. Data Flow Summary

| Source | Destination | Data | Protocol | Frequency |
|--------|------------|------|----------|-----------|
| CAN Bus | Vehicle Service | Speed, RPM, fuel | CAN 2.0B | 10-100 Hz |
| GPS Module | Navigation Service | Position, velocity | NMEA/UBX | 1-10 Hz |
| Audio DSP | Audio Service | Status, levels | I2S/SPI | On-demand |
| Health Service | Watchdog | System status | Internal | 1 Hz |
| API Gateway | All Controllers | HTTP requests | REST/JSON | On-demand |
| All Services | SQLite DB | Persistence | SQL | On-demand |
