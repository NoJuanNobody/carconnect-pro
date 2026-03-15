# Regulatory Standards Specification

**Document ID:** SPEC-RS-028
**Issue:** #28
**Product:** CarConnect Pro Aftermarket Infotainment System
**Target Vehicle:** Hyundai Elantra GT 2013
**Version:** 1.0
**Last Updated:** 2026-03-15

---

## 1. Purpose

This document details the specific regulatory standards applicable to CarConnect Pro, including FCC Part 15, automotive EMC per ISO 11452, UL/CE certifications, crash testing considerations, and audio noise regulations.

---

## 2. FCC Part 15 Compliance

### 2.1 Intentional Radiator Requirements

| Requirement ID | Radio | FCC Section | Frequency | Emission Limit |
|---|---|---|---|---|
| RS-FCC-001 | Bluetooth (BLE 5.0) | 15.247 | 2402-2480 MHz | 1 mW/MHz PSD, 1 W peak EIRP |
| RS-FCC-002 | Wi-Fi 2.4 GHz | 15.247 | 2412-2462 MHz | 1 W peak EIRP |
| RS-FCC-003 | Wi-Fi 5 GHz (UNII-1) | 15.407 | 5150-5250 MHz | 200 mW EIRP, indoor use |
| RS-FCC-004 | Wi-Fi 5 GHz (UNII-3) | 15.407 | 5725-5850 MHz | 1 W EIRP |
| RS-FCC-005 | Wi-Fi 5 GHz DFS channels | 15.407 | 5250-5350 MHz, 5470-5725 MHz | DFS and TPC required |

### 2.2 Unintentional Radiator Requirements (Class B)

| Requirement ID | Parameter | Frequency Range | Limit (at 3m) |
|---|---|---|---|
| RS-FCC-006 | Radiated emissions | 30-88 MHz | 100 uV/m (40 dBuV/m) |
| RS-FCC-007 | Radiated emissions | 88-216 MHz | 150 uV/m (43.5 dBuV/m) |
| RS-FCC-008 | Radiated emissions | 216-960 MHz | 200 uV/m (46 dBuV/m) |
| RS-FCC-009 | Radiated emissions | Above 960 MHz | 500 uV/m (54 dBuV/m) |
| RS-FCC-010 | Conducted emissions (AC line) | 150 kHz - 30 MHz | Per 15.107 Class B |

### 2.3 FCC Testing and Labeling

| Requirement ID | Requirement | Specification |
|---|---|---|
| RS-FCC-011 | Test laboratory | NVLAP-accredited or A2LA-accredited lab |
| RS-FCC-012 | Test report format | ANSI C63.4 measurement procedures |
| RS-FCC-013 | FCC ID format | CarConnect grantee code + product code |
| RS-FCC-014 | FCC label placement | External label on rear chassis; electronic display in Settings |
| RS-FCC-015 | FCC compliance statement | Required text in user manual and on-screen regulatory info |
| RS-FCC-016 | RF exposure compliance | SAR evaluation or computational analysis per KDB 447498 |

---

## 3. Automotive EMC — ISO 11452 Series

### 3.1 Radiated Immunity (ISO 11452-2)

| Requirement ID | Parameter | Specification | Test Level |
|---|---|---|---|
| RS-EMC-001 | Test method | Absorber-lined shielded enclosure (ALSE) | ISO 11452-2 |
| RS-EMC-002 | Frequency range | 80 MHz - 2 GHz | Continuous sweep |
| RS-EMC-003 | Field strength (functional) | 200 V/m | Immunity Level IV |
| RS-EMC-004 | Modulation | AM, 80%, 1 kHz | Per standard |
| RS-EMC-005 | Pass criteria — functional | No loss of function, no reset, no data corruption | During exposure |
| RS-EMC-006 | Pass criteria — degradation allowed | Temporary audio noise < 3 dB increase acceptable | During exposure |

### 3.2 Bulk Current Injection (ISO 11452-4)

| Requirement ID | Parameter | Specification |
|---|---|---|
| RS-EMC-007 | Frequency range | 1 MHz - 400 MHz |
| RS-EMC-008 | Injection current | 200 mA (Level IV) |
| RS-EMC-009 | Test harnesses | Power, CAN bus, speaker, antenna cables |
| RS-EMC-010 | Pass criteria | No loss of function, no CAN bus errors |

### 3.3 Conducted Transient Immunity (ISO 7637-2)

| Requirement ID | Pulse | Description | Level |
|---|---|---|---|
| RS-EMC-011 | Pulse 1 | Load dump (disconnection of inductive loads) | Level IV |
| RS-EMC-012 | Pulse 2a | Ignition off — intermittent | Level IV |
| RS-EMC-013 | Pulse 2b | Ignition off — sudden | Level IV |
| RS-EMC-014 | Pulse 3a/3b | Switching transients | Level IV |
| RS-EMC-015 | Pulse 5a | Load dump (centralized) | Level IV (40V/400ms) |
| RS-EMC-016 | Pass criteria | No permanent damage; functional after transient passes |

### 3.4 Conducted Emissions (CISPR 25)

| Requirement ID | Parameter | Specification |
|---|---|---|
| RS-EMC-017 | Measurement method | CISPR 25 (ALSE method) |
| RS-EMC-018 | Frequency range | 150 kHz - 2.5 GHz |
| RS-EMC-019 | Limit level | Level 3 (recommended for passenger vehicles) |
| RS-EMC-020 | Test harness | Power supply line, speaker lines |
| RS-EMC-021 | Pass criteria | All emissions below Level 3 limits |

---

## 4. UL Certification

### 4.1 Applicable UL Standards

| Requirement ID | Standard | Title | Applicability |
|---|---|---|---|
| RS-UL-001 | UL 60950-1 | Safety of Information Technology Equipment | General product safety |
| RS-UL-002 | UL 62368-1 | Audio/Video, IT and Communication Equipment Safety | Successor to 60950-1 |
| RS-UL-003 | UL 1642 | Lithium Batteries | If internal backup battery used |
| RS-UL-004 | UL 94 | Flammability of Plastic Materials | Enclosure and PCB materials |

### 4.2 UL Safety Requirements

| Requirement ID | Requirement | Specification |
|---|---|---|
| RS-UL-005 | Enclosure flammability | UL 94 V-0 rating minimum |
| RS-UL-006 | Creepage and clearance | Per UL 62368-1 for 16V DC input |
| RS-UL-007 | Temperature rise limits | Per UL 62368-1 Table 25 |
| RS-UL-008 | Abnormal operation safety | No fire, shock, or injury under single-fault conditions |
| RS-UL-009 | Energy hazard assessment | ES1 classification (< 20V DC, < 5A) |
| RS-UL-010 | Marking and instructions | UL compliance mark, safety instructions in manual |

---

## 5. CE Marking (Planned — EU Market)

### 5.1 Applicable Directives

| Requirement ID | Directive | Title | Status |
|---|---|---|---|
| RS-CE-001 | 2014/53/EU | Radio Equipment Directive (RED) | Planned for v2.0 |
| RS-CE-002 | 2014/30/EU | EMC Directive | Planned for v2.0 |
| RS-CE-003 | 2011/65/EU | RoHS Directive | Compliant in v1.0 |
| RS-CE-004 | 2012/19/EU | WEEE Directive | Compliant in v1.0 |

### 5.2 Harmonized Standards (EU)

| Requirement ID | Standard | Title |
|---|---|---|
| RS-CE-005 | EN 301 489-1 | EMC for radio equipment (general) |
| RS-CE-006 | EN 301 489-17 | EMC for broadband data transmission (Wi-Fi, BT) |
| RS-CE-007 | EN 300 328 | 2.4 GHz wideband data transmission (Wi-Fi, BT) |
| RS-CE-008 | EN 301 893 | 5 GHz RLAN (Wi-Fi) |
| RS-CE-009 | EN 62368-1 | Product safety |
| RS-CE-010 | EN 50498 | EMC for aftermarket electronic equipment in vehicles |

---

## 6. Crash Testing Considerations

### 6.1 Unit Retention During Impact

| Requirement ID | Requirement | Specification | Standard |
|---|---|---|---|
| RS-CRS-001 | Mounting retention force | Unit must not eject from dash at 20g frontal deceleration | Internal standard aligned with FMVSS 208 |
| RS-CRS-002 | Mounting bracket material | Steel or aluminum, minimum 1.5mm thickness | Internal standard |
| RS-CRS-003 | Faceplate material | ABS or polycarbonate, no sharp edges after fracture | FMVSS 201 philosophy |
| RS-CRS-004 | Display glass | Laminated or tempered, no sharp shards on fracture | Internal standard |
| RS-CRS-005 | Weight distribution | Center of gravity within 5mm of geometric center | Minimize rotational ejection force |

### 6.2 Electrical Safety During/After Impact

| Requirement ID | Requirement | Specification |
|---|---|---|
| RS-CRS-006 | Impact disconnect | In-line fuse or fusible link disconnects power on severe impact |
| RS-CRS-007 | No fire hazard | No sparking or sustained current on damaged PCB |
| RS-CRS-008 | CAN bus failsafe | CAN transceiver enters high-impedance state on power loss |
| RS-CRS-009 | Post-crash data retention | Diagnostic logs preserved on non-volatile storage for investigation |

### 6.3 Crash Testing Validation

| Requirement ID | Test | Specification |
|---|---|---|
| RS-CRS-010 | Frontal impact simulation | Sled test, 30g peak, 80ms pulse, unit installed in mock dashboard |
| RS-CRS-011 | Side impact simulation | Sled test, 20g peak, per ISO 16750-3 profile |
| RS-CRS-012 | Pass criteria | Unit retained in cavity, no sharp projections, fuse opens |

---

## 7. Audio Noise Regulations

### 7.1 In-Vehicle Audio Levels

| Requirement ID | Parameter | Specification | Rationale |
|---|---|---|---|
| RS-AUD-001 | Maximum audio output level | 110 dB SPL at driver head position | Hearing safety; no regulatory limit, but liability concern |
| RS-AUD-002 | Default maximum volume | 100 dB SPL at driver head position | User-configurable max |
| RS-AUD-003 | Volume limiting option | Configurable per-profile maximum volume | Parental/fleet control |
| RS-AUD-004 | Volume ramp rate | Max 6 dB/second increase on power-on | Prevent sudden loud audio |
| RS-AUD-005 | Emergency vehicle audio ducking | Reduce audio 20 dB when siren detected (future feature) | Safety consideration |

### 7.2 Electromagnetic Audio Interference

| Requirement ID | Parameter | Specification |
|---|---|---|
| RS-AUD-006 | Alternator whine rejection | > 60 dB rejection of 12V power supply ripple | Power supply filter design |
| RS-AUD-007 | CAN bus noise coupling | No audible artifacts from CAN bus activity | Shielding and ground isolation |
| RS-AUD-008 | Wi-Fi/BT interference | No audible artifacts from wireless transmissions | RF shielding on audio circuits |
| RS-AUD-009 | Engine ignition noise | No audible artifacts from ignition pulses | Input filtering, CISPR 25 compliance |

---

## 8. RoHS and Material Compliance

| Requirement ID | Requirement | Specification |
|---|---|---|
| RS-MAT-001 | RoHS compliance | EU Directive 2011/65/EU, all restricted substances below thresholds |
| RS-MAT-002 | REACH compliance | No SVHC substances above 0.1% by weight |
| RS-MAT-003 | Conflict minerals | Due diligence per Dodd-Frank Section 1502 |
| RS-MAT-004 | Halogen-free PCB | Preferred; halogen content < 900 ppm per IEC 61249-2-21 |
| RS-MAT-005 | Lead-free solder | SAC305 or equivalent lead-free alloy |

---

## 9. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-15 | CarConnect Pro Team | Initial release |
