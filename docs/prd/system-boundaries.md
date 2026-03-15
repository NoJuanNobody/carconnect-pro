# System Boundaries and Physical Constraints

**Document ID:** PRD-SB-019
**Issue:** #19
**Product:** CarConnect Pro Aftermarket Infotainment System
**Target Vehicle:** Hyundai Elantra GT 2013
**Version:** 1.0
**Last Updated:** 2026-03-15

---

## 1. Purpose

This document defines the physical constraints, dimensional limits, weight restrictions, clearance requirements, and thermal management boundaries for the CarConnect Pro system as installed in the Hyundai Elantra GT 2013 dashboard cavity.

---

## 2. Dashboard Cavity Dimensions

The Hyundai Elantra GT 2013 uses a standard double-DIN (2-DIN) head unit cavity. All CarConnect Pro components must fit within these dimensional constraints.

### 2.1 Cavity Specifications

| Parameter | Value | Tolerance |
|---|---|---|
| Cavity Width | 178 mm | +/- 1.0 mm |
| Cavity Height | 100 mm (2-DIN) | +/- 1.0 mm |
| Cavity Depth | 160 mm | +/- 2.0 mm |
| Mounting Bracket Spacing | 182 mm (outer) | +/- 0.5 mm |
| Faceplate Opening Width | 170 mm | +/- 0.5 mm |
| Faceplate Opening Height | 96 mm | +/- 0.5 mm |

### 2.2 Unit Dimensions

| Requirement ID | Parameter | Specification |
|---|---|---|
| SB-DIM-001 | Unit Width (chassis) | 178 mm max |
| SB-DIM-002 | Unit Height (chassis) | 100 mm max |
| SB-DIM-003 | Unit Depth (chassis, excluding connectors) | 150 mm max |
| SB-DIM-004 | Unit Depth (chassis, including connectors) | 158 mm max |
| SB-DIM-005 | Faceplate Protrusion beyond dash surface | 3 mm max |
| SB-DIM-006 | Display Bezel Width | 4 mm max per side |
| SB-DIM-007 | Display Active Area (diagonal) | 7.0 inches nominal |

---

## 3. Weight Limits

### 3.1 Unit Weight Constraints

| Requirement ID | Parameter | Specification | Rationale |
|---|---|---|---|
| SB-WGT-001 | Total unit weight (without mounting hardware) | 1.8 kg max | OEM bracket stress limits |
| SB-WGT-002 | Total installed weight (with brackets, harness) | 2.2 kg max | Dashboard structural load rating |
| SB-WGT-003 | Faceplate/display assembly weight | 0.4 kg max | Motorized tilt mechanism capacity |
| SB-WGT-004 | CAN bus interface module weight | 0.15 kg max | Adhesive/bracket mount rating |
| SB-WGT-005 | GPS antenna module weight | 0.05 kg max | Dashboard-top adhesive mount |

### 3.2 Vibration and Shock Considerations

Weight distribution must account for automotive vibration profiles. The center of gravity of the installed unit shall be within 5 mm of the geometric center of the chassis to minimize resonance-induced stress on mounting brackets.

---

## 4. Clearance Requirements

### 4.1 Internal Clearances

| Requirement ID | Parameter | Specification |
|---|---|---|
| SB-CLR-001 | Rear clearance to HVAC ducting | 15 mm min |
| SB-CLR-002 | Clearance to wiring harness bundles | 10 mm min |
| SB-CLR-003 | Clearance to steering column assembly | 25 mm min |
| SB-CLR-004 | Clearance to airbag module wiring | 30 mm min |
| SB-CLR-005 | Clearance to metal dashboard frame edges | 5 mm min |
| SB-CLR-006 | Ventilation gap (top of unit to cavity ceiling) | 8 mm min |
| SB-CLR-007 | Ventilation gap (bottom of unit to cavity floor) | 5 mm min |

### 4.2 Connector and Cable Routing

| Requirement ID | Parameter | Specification |
|---|---|---|
| SB-CLR-008 | Rear connector protrusion depth | 8 mm max per connector |
| SB-CLR-009 | Cable bend radius (power/audio) | 15 mm min |
| SB-CLR-010 | Cable bend radius (CAN bus) | 20 mm min |
| SB-CLR-011 | Cable bend radius (USB/data) | 12 mm min |
| SB-CLR-012 | Antenna cable routing clearance from power cables | 25 mm min |

### 4.3 Accessibility

| Requirement ID | Parameter | Specification |
|---|---|---|
| SB-CLR-013 | SD card slot accessibility (with unit installed) | Tool-free access required |
| SB-CLR-014 | USB port accessibility | Front-panel access required |
| SB-CLR-015 | Reset button accessibility | Accessible via pin-hole on faceplate |

---

## 5. Thermal Management Constraints

### 5.1 Operating Temperature Requirements

| Requirement ID | Parameter | Specification |
|---|---|---|
| SB-THR-001 | Operating ambient temperature range | -20 C to +70 C |
| SB-THR-002 | Storage temperature range | -40 C to +85 C |
| SB-THR-003 | Maximum internal component temperature (ARM Cortex-A78) | 95 C (junction) |
| SB-THR-004 | Maximum internal component temperature (Mali-G78 GPU) | 95 C (junction) |
| SB-THR-005 | Maximum PCB surface temperature | 80 C |
| SB-THR-006 | Maximum faceplate/display surface temperature | 55 C |
| SB-THR-007 | Maximum rear case surface temperature | 65 C |

### 5.2 Thermal Dissipation Design

| Requirement ID | Parameter | Specification |
|---|---|---|
| SB-THR-008 | Maximum sustained thermal dissipation (TDP) | 12 W |
| SB-THR-009 | Peak thermal dissipation (burst, 30s max) | 18 W |
| SB-THR-010 | Heatsink type | Passive aluminum fins, rear-mounted |
| SB-THR-011 | Heatsink fin height | 8 mm max (within depth constraint) |
| SB-THR-012 | Thermal pad interface (SoC to heatsink) | Thermal conductivity >= 5 W/mK |
| SB-THR-013 | Airflow path | Bottom intake, top/rear exhaust (convection) |

### 5.3 Thermal Protection Behavior

| Requirement ID | Condition | Action |
|---|---|---|
| SB-THR-014 | SoC junction temperature exceeds 85 C | Reduce CPU/GPU clock by 25% |
| SB-THR-015 | SoC junction temperature exceeds 90 C | Reduce CPU/GPU clock by 50%, dim display |
| SB-THR-016 | SoC junction temperature exceeds 95 C | Graceful shutdown, save state |
| SB-THR-017 | Ambient temperature below -20 C | Delay boot until SoC reaches -10 C via self-heating |
| SB-THR-018 | Ambient temperature exceeds 70 C (soak) | Enter low-power display-off standby |

### 5.4 Soak Temperature Recovery

After prolonged sun exposure (vehicle parked, interior temperature up to 85 C), the unit shall:

1. Remain in thermal protection standby until ambient drops below 70 C.
2. Boot to operational state within 45 seconds of ambient reaching 60 C.
3. Reach full performance within 120 seconds of initial boot.

---

## 6. Electrical Interface Boundaries

### 6.1 Power Supply

| Requirement ID | Parameter | Specification |
|---|---|---|
| SB-PWR-001 | Nominal input voltage | 12 V DC (vehicle battery) |
| SB-PWR-002 | Operating voltage range | 9.0 V to 16.0 V DC |
| SB-PWR-003 | Maximum steady-state current draw | 3.0 A at 12 V |
| SB-PWR-004 | Peak current draw (boot, 5s) | 5.0 A at 12 V |
| SB-PWR-005 | Standby current draw (ACC off) | 10 mA max |
| SB-PWR-006 | Reverse polarity protection | Required, non-destructive |
| SB-PWR-007 | Load dump protection (ISO 7637-2) | Up to 40 V, 400 ms |
| SB-PWR-008 | Cranking voltage tolerance | Down to 6.0 V for 500 ms |

---

## 7. Mechanical Interface Boundaries

### 7.1 Mounting

| Requirement ID | Parameter | Specification |
|---|---|---|
| SB-MNT-001 | Mounting method | OEM-compatible DIN sleeve + side brackets |
| SB-MNT-002 | Mounting screw type | M5 x 8 mm, Phillips head |
| SB-MNT-003 | Number of mounting points | 4 (2 per side, minimum) |
| SB-MNT-004 | Anti-vibration isolation | Rubber grommets on all mounting points |
| SB-MNT-005 | Removal method | DIN removal keys (included) |

### 7.2 Ingress Protection

| Requirement ID | Parameter | Specification |
|---|---|---|
| SB-MNT-006 | Faceplate IP rating | IP52 (dust protected, drip-proof) |
| SB-MNT-007 | Rear chassis IP rating | IP40 (object protected) |
| SB-MNT-008 | Connector IP rating (mated) | IP40 minimum |

---

## 8. Boundary Exclusions

The following items are explicitly outside the physical system boundary:

| Item | Responsibility |
|---|---|
| Vehicle battery and charging system | Vehicle OEM |
| Factory speaker drivers | Vehicle OEM (reused as-is) |
| Dashboard trim panel fitment | Installation technician |
| External GPS antenna placement | Installation technician |
| Bluetooth/Wi-Fi antenna (internal) | Included in unit |
| CAN bus gateway/OBD-II port | Vehicle OEM |
| Smartphone devices | End user |

---

## 9. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-15 | CarConnect Pro Team | Initial release |
