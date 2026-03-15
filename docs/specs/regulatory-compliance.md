# Regulatory Compliance Requirements

**Document ID:** SPEC-RC-023
**Issue:** #23
**Product:** CarConnect Pro Aftermarket Infotainment System
**Target Vehicle:** Hyundai Elantra GT 2013
**Version:** 1.0
**Last Updated:** 2026-03-15

---

## 1. Purpose

This document defines the regulatory compliance requirements for CarConnect Pro, covering DOT regulations, FCC certification for wireless components, state-specific driver distraction laws, and the compliance verification process.

---

## 2. Department of Transportation (DOT) Regulations

### 2.1 FMVSS Applicability

CarConnect Pro is classified as an aftermarket accessory. While not directly subject to Federal Motor Vehicle Safety Standards (FMVSS) as a vehicle manufacturer obligation, the system must not compromise any FMVSS compliance of the host vehicle.

| Requirement ID | FMVSS Standard | Requirement | CarConnect Pro Impact |
|---|---|---|---|
| RC-DOT-001 | FMVSS 101 | Controls and displays | Display must not obstruct OEM instrument cluster visibility |
| RC-DOT-002 | FMVSS 111 | Rearview mirrors | Installation must not interfere with mirror mounting or adjustment |
| RC-DOT-003 | FMVSS 114 | Theft protection | System must not bypass or interfere with immobilizer |
| RC-DOT-004 | FMVSS 208 | Occupant crash protection | No interference with airbag deployment systems |
| RC-DOT-005 | FMVSS 302 | Flammability of interior materials | All visible materials must meet flammability rating |
| RC-DOT-006 | FMVSS 214 | Side impact protection | Installation must not compromise side-impact structure |

### 2.2 NHTSA Visual-Manual Driver Distraction Guidelines

| Requirement ID | Guideline | Implementation |
|---|---|---|
| RC-DOT-007 | Single glance duration | No task requires more than 2 seconds of eyes-off-road time |
| RC-DOT-008 | Total glance time | No task requires more than 12 seconds total glance time |
| RC-DOT-009 | Task completion time | All primary tasks completable within 12 seconds |
| RC-DOT-010 | Lockout of complex tasks while driving | Video playback, detailed settings, and text entry locked when vehicle speed > 5 mph |
| RC-DOT-011 | Speed-based lockout detection | Vehicle speed determined via CAN bus; fallback to GPS speed |
| RC-DOT-012 | Font size minimum | On-screen text minimum 24pt equivalent at 750mm viewing distance |
| RC-DOT-013 | Touch target size | Minimum 17.5mm x 17.5mm touch targets for driving tasks |

### 2.3 Aftermarket Device Installation Standards

| Requirement ID | Standard | Requirement |
|---|---|---|
| RC-DOT-014 | SAE J1113 | EMC requirements for aftermarket devices |
| RC-DOT-015 | SAE J1455 | Environmental testing for aftermarket electronics |
| RC-DOT-016 | SEMA/SAN guidelines | Aftermarket product safety and quality standards |
| RC-DOT-017 | Wiring standards | All wiring must meet SAE J1128 (low-tension cables) |

---

## 3. FCC Certification

### 3.1 FCC Part 15 — Intentional Radiators

| Requirement ID | Parameter | Requirement | Specification |
|---|---|---|---|
| RC-FCC-001 | Wi-Fi (2.4 GHz) emissions | FCC Part 15.247 | Max EIRP 1 W (30 dBm) |
| RC-FCC-002 | Wi-Fi (5 GHz UNII-1) emissions | FCC Part 15.407 | Max EIRP 200 mW (23 dBm) |
| RC-FCC-003 | Wi-Fi (5 GHz UNII-3) emissions | FCC Part 15.407 | Max EIRP 1 W (30 dBm), DFS required |
| RC-FCC-004 | Bluetooth (2.4 GHz) emissions | FCC Part 15.247 | Max EIRP 100 mW (20 dBm) |
| RC-FCC-005 | GPS receiver | FCC Part 15.109 | Unintentional radiator limits |
| RC-FCC-006 | Spurious emissions | FCC Part 15.209 | Below specified limits across all frequencies |
| RC-FCC-007 | FCC ID labeling | FCC Part 15.19 | FCC ID displayed on device and in software settings |

### 3.2 FCC Part 15 — Unintentional Radiators

| Requirement ID | Parameter | Requirement |
|---|---|---|
| RC-FCC-008 | Conducted emissions (power line) | Per FCC Part 15.107, Class B limits |
| RC-FCC-009 | Radiated emissions (3m) | Per FCC Part 15.109, Class B limits |
| RC-FCC-010 | Digital device classification | Class B (residential/vehicle environment) |

### 3.3 FCC Certification Process

| Requirement ID | Step | Description |
|---|---|---|
| RC-FCC-011 | Pre-compliance testing | Internal EMC lab testing before submission |
| RC-FCC-012 | Accredited lab testing | Testing at FCC-accredited test laboratory |
| RC-FCC-013 | TCB certification | Certification via Telecommunication Certification Body |
| RC-FCC-014 | FCC ID assignment | Obtain and apply FCC ID to all production units |
| RC-FCC-015 | Post-market compliance | Annual re-verification of production unit compliance |
| RC-FCC-016 | Design change impact | Re-certification required for RF circuit changes |

---

## 4. State-Specific Driver Distraction Laws

### 4.1 Display Compliance Matrix

| Requirement ID | Jurisdiction | Law | Implementation |
|---|---|---|---|
| RC-SDL-001 | California (CVC 27602) | No video visible to driver while driving | Video playback disabled when vehicle in motion |
| RC-SDL-002 | New York (VTL 1225-d) | No portable electronic device use while driving | System classified as installed equipment (exempt); touch targets comply with distraction guidelines |
| RC-SDL-003 | Illinois (625 ILCS 5/12-610.2) | Electronic communication device restrictions | Hands-free operation only while driving |
| RC-SDL-004 | All US states | Varying handheld device laws | Hands-free calling via built-in microphone and Bluetooth |
| RC-SDL-005 | All US states | Display visibility restrictions | No video/TV content displayed while vehicle speed > 0 mph (with CAN bus verification) |

### 4.2 Distraction Mitigation Features

| Requirement ID | Feature | Specification |
|---|---|---|
| RC-SDL-006 | Driving mode detection | Automatic activation when vehicle speed > 5 mph via CAN bus |
| RC-SDL-007 | Driving mode restrictions | Simplified UI, no video, no manual text entry, enlarged touch targets |
| RC-SDL-008 | Voice command availability | Full voice control available in driving mode |
| RC-SDL-009 | Passenger override | Not available; safety restrictions apply regardless of occupancy |
| RC-SDL-010 | Restriction bypass prevention | No user-accessible setting to disable driving restrictions |

---

## 5. International Compliance (Future Markets)

| Requirement ID | Region | Standard | Status |
|---|---|---|---|
| RC-INT-001 | European Union | CE marking (RED 2014/53/EU) | Planned for v2.0 |
| RC-INT-002 | European Union | UNECE R10 (EMC for vehicles) | Planned for v2.0 |
| RC-INT-003 | Canada | ISED (Innovation, Science and Economic Development) | Required for Canadian sales |
| RC-INT-004 | Canada | RSS-247 (digital transmission systems) | Required for Canadian sales |
| RC-INT-005 | Australia | RCM (Regulatory Compliance Mark) | Planned for v2.0 |

---

## 6. Compliance Verification Process

### 6.1 Verification Workflow

| Requirement ID | Phase | Activities | Exit Criteria |
|---|---|---|---|
| RC-VER-001 | Design review | Review schematics against regulatory requirements | Checklist signed by compliance engineer |
| RC-VER-002 | Prototype testing | Pre-compliance EMC, safety, and distraction testing | All measurements within spec with margin |
| RC-VER-003 | Formal certification testing | Accredited lab testing for FCC, UL, DOT | Test reports issued, certificates granted |
| RC-VER-004 | Production validation | First-article inspection, production unit EMC spot-check | 3 units pass all compliance tests |
| RC-VER-005 | Ongoing compliance | Annual production sampling, design change review | No non-conformances in sampled units |

### 6.2 Documentation Requirements

| Requirement ID | Document | Retention Period |
|---|---|---|
| RC-VER-006 | FCC test reports | Life of product + 5 years |
| RC-VER-007 | UL certification documents | Life of product + 5 years |
| RC-VER-008 | DOT compliance declaration | Life of product + 5 years |
| RC-VER-009 | Design change impact assessments | Life of product + 5 years |
| RC-VER-010 | Production compliance sampling records | 10 years |

### 6.3 Non-Compliance Response

| Requirement ID | Scenario | Response Procedure |
|---|---|---|
| RC-VER-011 | Pre-production non-compliance | Design revision, re-test, no shipment until resolved |
| RC-VER-012 | Production non-compliance (minor) | Root cause analysis, corrective action within 30 days |
| RC-VER-013 | Production non-compliance (major) | Production halt, investigation, regulatory notification if required |
| RC-VER-014 | Field-reported compliance issue | Investigation within 48 hours, corrective action plan within 14 days |
| RC-VER-015 | Regulatory recall | Follow NHTSA recall procedures, customer notification within 60 days |

---

## 7. Compliance Labeling and Declarations

| Requirement ID | Label/Declaration | Location |
|---|---|---|
| RC-LBL-001 | FCC ID label | Rear of unit chassis (visible when installed in some configurations), also in Settings > About |
| RC-LBL-002 | FCC compliance statement | Printed in user manual and displayed in Settings > About > Regulatory |
| RC-LBL-003 | UL listing mark | Rear of unit chassis |
| RC-LBL-004 | Country of manufacture | Rear label |
| RC-LBL-005 | RoHS compliance | Rear label |
| RC-LBL-006 | WEEE symbol | Rear label and user manual |

---

## 8. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-15 | CarConnect Pro Team | Initial release |
