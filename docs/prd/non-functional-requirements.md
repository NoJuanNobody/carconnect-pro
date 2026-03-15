# Non-Functional Requirements

**Document ID:** PRD-NFR-021
**Issue:** #21
**Product:** CarConnect Pro Aftermarket Infotainment System
**Target Vehicle:** Hyundai Elantra GT 2013
**Version:** 1.0
**Last Updated:** 2026-03-15

---

## 1. Purpose

This document specifies the non-functional requirements for CarConnect Pro, covering reliability, security, maintainability, performance benchmarks, and environmental durability. These requirements apply across all operating modes.

---

## 2. Reliability

### 2.1 Mean Time Between Failures (MTBF)

| Requirement ID | Component/Subsystem | MTBF Target | Measurement Method |
|---|---|---|---|
| NFR-REL-001 | Complete system (all subsystems) | 15,000 hours min | Field failure data, accelerated life testing |
| NFR-REL-002 | Main SoC (ARM Cortex-A78) | 50,000 hours min | Component-level MTBF per manufacturer data |
| NFR-REL-003 | Display panel | 30,000 hours min | Backlight half-life, pixel failure rate |
| NFR-REL-004 | CAN bus interface | 40,000 hours min | Communication error rate monitoring |
| NFR-REL-005 | Storage (eMMC) | 30,000 hours min | Write endurance, read error rate |
| NFR-REL-006 | Power supply module | 40,000 hours min | Capacitor ESR degradation, voltage stability |

### 2.2 Availability

| Requirement ID | Requirement | Target |
|---|---|---|
| NFR-REL-007 | System availability during vehicle operation | 99.5% uptime |
| NFR-REL-008 | Audio subsystem availability | 99.9% uptime |
| NFR-REL-009 | Navigation subsystem availability | 99.0% uptime |
| NFR-REL-010 | Maximum unplanned reboots per 1,000 operating hours | 2 or fewer |
| NFR-REL-011 | Recovery time after unplanned reboot | 30 seconds max to operational state |
| NFR-REL-012 | Data integrity after unexpected power loss | No corruption of user profiles or settings |

### 2.3 Fault Tolerance

| Requirement ID | Requirement | Specification |
|---|---|---|
| NFR-REL-013 | GPS signal loss behavior | Continue with dead reckoning for 60 seconds, display last known position |
| NFR-REL-014 | CAN bus communication failure | Isolate CAN interface, maintain audio/nav functionality |
| NFR-REL-015 | Display failure mode | Continue audio output, maintain CAN bus passthrough |
| NFR-REL-016 | Storage read error handling | Retry 3 times, fall back to cached data, log error |
| NFR-REL-017 | Watchdog timer | Hardware watchdog, 5-second timeout, auto-restart on hang |

---

## 3. Security

### 3.1 Authentication and Access Control

| Requirement ID | Requirement | Specification |
|---|---|---|
| NFR-SEC-001 | User profile PIN protection | Optional 4-6 digit PIN per profile |
| NFR-SEC-002 | Installer/service access | Separate technician PIN with audit logging |
| NFR-SEC-003 | Debug port access | JTAG/UART disabled in production firmware |
| NFR-SEC-004 | USB device authentication | Whitelist-based USB device class filtering |
| NFR-SEC-005 | Bluetooth pairing authorization | User confirmation required for all new pairings |

### 3.2 Data Security

| Requirement ID | Requirement | Specification |
|---|---|---|
| NFR-SEC-006 | User data encryption at rest | AES-256, hardware-accelerated |
| NFR-SEC-007 | Bluetooth communication encryption | BLE 5.0 Secure Connections, ECDH P-256 |
| NFR-SEC-008 | Wi-Fi encryption | WPA3-Personal minimum |
| NFR-SEC-009 | OTA update integrity verification | RSA-4096 signed firmware images |
| NFR-SEC-010 | CAN bus message authentication | HMAC-based authentication for outbound messages |

### 3.3 Firmware Security

| Requirement ID | Requirement | Specification |
|---|---|---|
| NFR-SEC-011 | Secure boot chain | Hardware root of trust, verified bootloader |
| NFR-SEC-012 | Firmware rollback protection | Signed version counter, prevent downgrade attacks |
| NFR-SEC-013 | Code signing | All executable code must be signed and verified |
| NFR-SEC-014 | Vulnerability patching SLA | Critical: 30 days, High: 60 days, Medium: 90 days |

---

## 4. Maintainability

### 4.1 Software Maintainability

| Requirement ID | Requirement | Specification |
|---|---|---|
| NFR-MNT-001 | OTA update capability | Full firmware and application updates over Wi-Fi |
| NFR-MNT-002 | USB update capability | Firmware update via USB flash drive |
| NFR-MNT-003 | Diagnostic data logging | Persistent log buffer, 7-day rolling window |
| NFR-MNT-004 | Remote diagnostics | Diagnostic data export via USB or Wi-Fi |
| NFR-MNT-005 | Configuration backup/restore | Full settings export/import via USB |
| NFR-MNT-006 | Factory reset capability | One-step reset to factory defaults |

### 4.2 Hardware Maintainability

| Requirement ID | Requirement | Specification |
|---|---|---|
| NFR-MNT-007 | Unit removal time (trained installer) | 15 minutes max |
| NFR-MNT-008 | Unit installation time (trained installer) | 45 minutes max (first install), 30 minutes (reinstall) |
| NFR-MNT-009 | Fuse replacement | Accessible without unit removal |
| NFR-MNT-010 | Connector type | Keyed, color-coded, tool-free mating |
| NFR-MNT-011 | Component-level repairability | Main PCB, display, and power board independently replaceable |

### 4.3 Documentation Requirements

| Requirement ID | Requirement | Specification |
|---|---|---|
| NFR-MNT-012 | Installation guide | Illustrated, step-by-step, vehicle-specific |
| NFR-MNT-013 | User manual | Digital (in-unit) and printed quick-start card |
| NFR-MNT-014 | Service manual | Component-level troubleshooting, wiring diagrams |
| NFR-MNT-015 | API documentation | RESTful diagnostic API fully documented |

---

## 5. Performance Benchmarks

### 5.1 Boot and Response Times

| Requirement ID | Metric | Target | Measurement Condition |
|---|---|---|---|
| NFR-PER-001 | Cold boot to splash screen | 3 seconds max | From ACC-on signal |
| NFR-PER-002 | Cold boot to audio playback | 8 seconds max | Last source resume |
| NFR-PER-003 | Cold boot to full operational state | 15 seconds max | All subsystems ready |
| NFR-PER-004 | Resume from standby | 2 seconds max | Display on, audio active |
| NFR-PER-005 | Touch input latency | 50 ms max | From touch to visual response |
| NFR-PER-006 | Physical button input latency | 30 ms max | From press to action |
| NFR-PER-007 | Audio source switching | 1 second max | Between any two sources |
| NFR-PER-008 | Navigation route calculation (50 km) | 5 seconds max | With cached map data |

### 5.2 Audio Performance

| Requirement ID | Metric | Target |
|---|---|---|
| NFR-PER-009 | Audio output THD+N | < 0.05% at 1 kHz, 1 W |
| NFR-PER-010 | Audio output SNR | > 95 dB (A-weighted) |
| NFR-PER-011 | Audio output power (per channel) | 22 W RMS into 4 ohm |
| NFR-PER-012 | Audio channel count | 4 channels (front L/R, rear L/R) |
| NFR-PER-013 | Audio sample rate support | 44.1 kHz, 48 kHz, 96 kHz |
| NFR-PER-014 | Audio bit depth support | 16-bit and 24-bit |
| NFR-PER-015 | Audio DSP latency | < 10 ms (input to output) |

### 5.3 Display Performance

| Requirement ID | Metric | Target |
|---|---|---|
| NFR-PER-016 | Display resolution | 1024 x 600 minimum |
| NFR-PER-017 | Display frame rate (UI) | 60 fps |
| NFR-PER-018 | Display brightness range | 50 to 850 nits |
| NFR-PER-019 | Display color depth | 24-bit (16.7M colors) |
| NFR-PER-020 | Viewing angle (horizontal) | 160 degrees minimum |
| NFR-PER-021 | Auto-brightness response time | 2 seconds max |

### 5.4 Processing Performance

| Requirement ID | Metric | Target |
|---|---|---|
| NFR-PER-022 | CPU utilization (idle, home screen) | < 15% |
| NFR-PER-023 | CPU utilization (navigation + audio) | < 60% |
| NFR-PER-024 | RAM utilization (peak, all features active) | < 80% of available RAM |
| NFR-PER-025 | GPU utilization (UI rendering) | < 40% |
| NFR-PER-026 | Storage I/O (sequential read) | 200 MB/s minimum |

---

## 6. Environmental Durability

### 6.1 Temperature

| Requirement ID | Parameter | Specification | Standard |
|---|---|---|---|
| NFR-ENV-001 | Operating temperature range | -20 C to +70 C | SAE J1455 |
| NFR-ENV-002 | Storage temperature range | -40 C to +85 C | SAE J1455 |
| NFR-ENV-003 | Thermal shock resistance | -20 C to +70 C, 10 cycles, 1 hr dwell | IEC 60068-2-14 |
| NFR-ENV-004 | High temperature endurance | 70 C continuous, 500 hours | IEC 60068-2-2 |

### 6.2 Vibration and Shock

| Requirement ID | Parameter | Specification | Standard |
|---|---|---|---|
| NFR-ENV-005 | Random vibration endurance | 10-500 Hz, 3.0 grms, 8 hrs/axis | SAE J1455 |
| NFR-ENV-006 | Sinusoidal vibration | 10-80 Hz, 3g peak, swept | ISO 16750-3 |
| NFR-ENV-007 | Mechanical shock resistance | 50g, 6 ms half-sine, 3 axes | SAE J1455 |
| NFR-ENV-008 | Drop test (packaged unit) | 1 m drop onto concrete, 6 faces | Internal standard |

### 6.3 Humidity and Corrosion

| Requirement ID | Parameter | Specification | Standard |
|---|---|---|---|
| NFR-ENV-009 | Humidity endurance | 85% RH at 55 C, 500 hours | IEC 60068-2-78 |
| NFR-ENV-010 | Condensation resistance | Operation after thermal cycling with condensation | SAE J1455 |
| NFR-ENV-011 | Salt spray resistance (connectors) | 48 hours, 5% NaCl | ISO 9227 |

### 6.4 EMC and ESD

| Requirement ID | Parameter | Specification | Standard |
|---|---|---|---|
| NFR-ENV-012 | Radiated emissions | Class B limits | FCC Part 15 |
| NFR-ENV-013 | Conducted emissions | CISPR 25 Level 3 | CISPR 25 |
| NFR-ENV-014 | Radiated immunity | 200 V/m, 80 MHz - 2 GHz | ISO 11452-2 |
| NFR-ENV-015 | ESD immunity (contact discharge) | +/- 6 kV | ISO 10605 |
| NFR-ENV-016 | ESD immunity (air discharge) | +/- 15 kV | ISO 10605 |
| NFR-ENV-017 | Bulk current injection immunity | 200 mA, 1-400 MHz | ISO 11452-4 |

---

## 7. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-15 | CarConnect Pro Team | Initial release |
