# Vehicle Integration Safety Specification

**Document ID:** SPEC-VIS-026
**Issue:** #26
**Product:** CarConnect Pro Aftermarket Infotainment System
**Target Vehicle:** Hyundai Elantra GT 2013
**Version:** 1.0
**Last Updated:** 2026-03-15

---

## 1. Purpose

This document specifies the vehicle integration safety requirements for CarConnect Pro, covering CAN bus message filtering, electrical isolation, emergency shutdown procedures, airbag non-interference validation, and data backup procedures during integration operations.

---

## 2. CAN Bus Message Filtering for Safety

### 2.1 CAN Bus Architecture

The Hyundai Elantra GT 2013 uses a high-speed CAN bus (500 kbps) for powertrain and body control communication. CarConnect Pro connects as a read-mostly node for vehicle data acquisition.

| Requirement ID | Parameter | Specification |
|---|---|---|
| VIS-CAN-001 | CAN bus standard | ISO 11898-2 (high-speed CAN) |
| VIS-CAN-002 | Bus speed | 500 kbps |
| VIS-CAN-003 | Connection point | OBD-II port via T-harness (non-intrusive) |
| VIS-CAN-004 | CAN controller | Dedicated CAN controller IC with hardware filtering |
| VIS-CAN-005 | Bus termination | System does NOT add termination (vehicle already terminated) |

### 2.2 Message Filtering — Read (Receive) Whitelist

| Requirement ID | CAN ID Range | Message Purpose | Access |
|---|---|---|---|
| VIS-CAN-006 | 0x316 | Vehicle speed | Read only |
| VIS-CAN-007 | 0x329 | Engine RPM | Read only |
| VIS-CAN-008 | 0x545 | Fuel level | Read only |
| VIS-CAN-009 | 0x5B0 | Coolant temperature | Read only |
| VIS-CAN-010 | 0x4F1 | Steering wheel buttons | Read only |
| VIS-CAN-011 | 0x251 | Gear position (Park/Drive/Reverse) | Read only |
| VIS-CAN-012 | 0x260 | Parking brake status | Read only |
| VIS-CAN-013 | 0x2B0 | Door open/close status | Read only |
| VIS-CAN-014 | 0x381 | Illumination/dimmer level | Read only |

### 2.3 Message Filtering — Write (Transmit) Restrictions

| Requirement ID | Requirement | Specification |
|---|---|---|
| VIS-CAN-015 | Write capability | Disabled by default; only enabled for steering wheel control learning |
| VIS-CAN-016 | Write whitelist | Only diagnostic response messages (0x7E8 range) during calibration |
| VIS-CAN-017 | Write rate limit | Maximum 10 messages/second during calibration mode |
| VIS-CAN-018 | Write lockout in operation | CAN transmit disabled after initial calibration is complete |
| VIS-CAN-019 | Hardware write-protect | Physical jumper on PCB to permanently disable CAN transmit |

### 2.4 Safety-Critical Message Exclusion

| Requirement ID | Excluded CAN ID Range | System | Reason |
|---|---|---|---|
| VIS-CAN-020 | 0x080-0x0FF | Airbag/SRS system | Safety-critical, no interaction permitted |
| VIS-CAN-021 | 0x100-0x1FF | ABS/ESC system | Safety-critical, no interaction permitted |
| VIS-CAN-022 | 0x200-0x24F | Engine management | Powertrain-critical, no interaction permitted |
| VIS-CAN-023 | 0x300-0x31F | Transmission control | Powertrain-critical, no interaction permitted |
| VIS-CAN-024 | All unlisted IDs | Unknown/unidentified | Rejected by hardware filter |

### 2.5 CAN Bus Error Handling

| Requirement ID | Condition | Action |
|---|---|---|
| VIS-CAN-025 | Bus-off condition detected | Disconnect CAN transceiver, log event, continue other functions |
| VIS-CAN-026 | Error frame rate > 10/second | Reduce receive rate, alert diagnostics |
| VIS-CAN-027 | CAN controller reset | Auto-recovery after 5 seconds, max 3 retries then disconnect |
| VIS-CAN-028 | Incorrect message data (out-of-range values) | Discard message, use last known good value, log anomaly |

---

## 3. Electrical Isolation

### 3.1 Power Isolation

| Requirement ID | Requirement | Specification |
|---|---|---|
| VIS-ISO-001 | Power input filtering | LC filter on 12V input, common-mode choke |
| VIS-ISO-002 | Reverse polarity protection | P-channel MOSFET, non-destructive up to -16V |
| VIS-ISO-003 | Overcurrent protection | Automotive-rated fuse (15A) + electronic current limiting (5A) |
| VIS-ISO-004 | Load dump protection | TVS diode clamp, ISO 7637-2 compliant (40V/400ms) |
| VIS-ISO-005 | Voltage regulation | Switching regulator with input range 6V-16V, output 5V/3.3V |
| VIS-ISO-006 | Ground isolation | Single-point chassis ground, no ground loops |

### 3.2 CAN Bus Isolation

| Requirement ID | Requirement | Specification |
|---|---|---|
| VIS-ISO-007 | CAN transceiver isolation | Galvanic isolation via isolated CAN transceiver (ISO 11898-2 compliant) |
| VIS-ISO-008 | Isolation voltage rating | 2500 Vrms for 1 minute (per UL 60950) |
| VIS-ISO-009 | CAN bus impedance matching | Transceiver output impedance matches bus (60 ohm differential) |
| VIS-ISO-010 | ESD protection on CAN lines | TVS diodes, IEC 61000-4-2 Level 4 (+/- 8kV contact) |

### 3.3 Audio Output Isolation

| Requirement ID | Requirement | Specification |
|---|---|---|
| VIS-ISO-011 | Speaker output type | Bridge-tied load (BTL), floating outputs |
| VIS-ISO-012 | Speaker output short protection | Auto-detect and shutdown on short to ground, chassis, or between channels |
| VIS-ISO-013 | Speaker output current limiting | 5A peak per channel |
| VIS-ISO-014 | Audio ground | Separate analog ground plane, star-grounded to chassis |

---

## 4. Emergency Shutdown Procedures

### 4.1 Automatic Emergency Shutdown

| Requirement ID | Trigger | Action | Recovery |
|---|---|---|---|
| VIS-EMG-001 | Input voltage > 16.5V sustained 100ms | Shutdown all outputs, disconnect CAN | Auto-restart when voltage normalizes |
| VIS-EMG-002 | Input voltage < 6.0V sustained 200ms | Controlled shutdown, save state | Auto-restart when voltage > 9.0V |
| VIS-EMG-003 | SoC temperature > 95 C | Graceful shutdown, save state | Auto-restart after cooldown (< 80 C) |
| VIS-EMG-004 | CAN bus short circuit detected | Disconnect CAN transceiver | Manual reset or power cycle required |
| VIS-EMG-005 | Speaker output short detected | Disable affected channel | Auto-retry after 30 seconds, 3 attempts max |
| VIS-EMG-006 | Watchdog timeout (5s) | Hardware reset | Auto-restart, log event |

### 4.2 Manual Emergency Shutdown

| Requirement ID | Method | Result |
|---|---|---|
| VIS-EMG-007 | Long press power button (10 seconds) | Hard power off, state not saved |
| VIS-EMG-008 | Disconnect ACC wire | Controlled shutdown sequence (5-second delay) |
| VIS-EMG-009 | Remove inline fuse | Immediate power cut, no data corruption risk (journaled filesystem) |

### 4.3 Shutdown Sequence

| Requirement ID | Step | Action | Timeout |
|---|---|---|---|
| VIS-EMG-010 | 1 | Mute audio outputs | Immediate |
| VIS-EMG-011 | 2 | Disconnect CAN bus transceiver | 100 ms |
| VIS-EMG-012 | 3 | Save user state and settings | 2 seconds |
| VIS-EMG-013 | 4 | Flush filesystem buffers | 1 second |
| VIS-EMG-014 | 5 | Power down SoC | 500 ms |
| VIS-EMG-015 | 6 | Disable power regulators | Immediate after SoC halt |

---

## 5. Airbag Non-Interference Validation

### 5.1 Design Requirements

| Requirement ID | Requirement | Specification |
|---|---|---|
| VIS-AIR-001 | Physical clearance from airbag module | 50 mm minimum from steering column airbag module wiring |
| VIS-AIR-002 | Physical clearance from airbag sensors | 30 mm minimum from any crash sensor |
| VIS-AIR-003 | No shared wiring harness with SRS | Dedicated harness, no shared conductors with SRS |
| VIS-AIR-004 | EMI to airbag system | Radiated emissions below SRS sensitivity threshold at 30cm distance |
| VIS-AIR-005 | CAN bus SRS message exclusion | SRS CAN IDs (0x080-0x0FF) blocked at hardware filter level |

### 5.2 Validation Testing

| Requirement ID | Test | Procedure | Pass Criteria |
|---|---|---|---|
| VIS-AIR-006 | SRS diagnostic check (pre-install) | Record all SRS DTCs before installation | Baseline established |
| VIS-AIR-007 | SRS diagnostic check (post-install) | Scan SRS DTCs after installation | No new DTCs |
| VIS-AIR-008 | Airbag warning light verify | Confirm airbag warning light behavior | Normal bulb check sequence, no persistent warning |
| VIS-AIR-009 | EMI proximity test | Measure emissions at airbag module proximity during full system load | Below SRS immunity threshold |
| VIS-AIR-010 | CAN bus SRS verification | Confirm no SRS messages are read or written by CarConnect | Zero SRS messages in capture log |
| VIS-AIR-011 | Installation harness routing review | Verify harness does not pass through or near SRS components | Photo documentation of routing |

### 5.3 Ongoing Monitoring

| Requirement ID | Requirement | Specification |
|---|---|---|
| VIS-AIR-012 | Airbag light monitoring via CAN | If airbag warning light CAN message detected as ON, log alert | Alert stored in diagnostic log |
| VIS-AIR-013 | Post-installation responsibility | Installer must verify SRS status; documented in install checklist | Signed checklist required |

---

## 6. Backup Procedures During Integration

### 6.1 Pre-Installation Vehicle State Backup

| Requirement ID | Item | Backup Method | Responsibility |
|---|---|---|---|
| VIS-BAK-001 | Vehicle radio presets and settings | Customer documents their preferences | End user / installer |
| VIS-BAK-002 | SRS DTC baseline | OBD-II scan, saved to diagnostic app | Installer (Tier 2+) |
| VIS-BAK-003 | All vehicle DTCs | Full OBD-II scan, saved to diagnostic app | Installer (Tier 2+) |
| VIS-BAK-004 | Dashboard photo (pre-install) | Photo documentation | Installer |
| VIS-BAK-005 | OEM radio serial number | Recorded for potential reinstallation | Installer |

### 6.2 OEM Unit Preservation

| Requirement ID | Requirement | Specification |
|---|---|---|
| VIS-BAK-006 | OEM unit storage | Customer retains OEM head unit for potential reinstallation |
| VIS-BAK-007 | OEM harness preservation | T-harness or adapter used; no cutting of OEM wires |
| VIS-BAK-008 | Reversibility | Installation is fully reversible; OEM unit can be reinstalled |
| VIS-BAK-009 | OEM antenna adapter | Adapter included; OEM antenna cable not modified |

---

## 7. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-15 | CarConnect Pro Team | Initial release |
