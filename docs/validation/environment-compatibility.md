# CarConnect Pro - Environment Compatibility Matrix

> **Version:** 1.0.0
> **Last Updated:** 2026-03-15
> **Status:** Approved

## 1. Overview

This document defines the hardware and software environment compatibility matrix for CarConnect Pro, including storage performance testing results and platform support.

## 2. Hardware Compatibility Matrix

### 2.1 Supported Processors

| Processor | Architecture | Cores | Clock | Status | Notes |
|-----------|-------------|-------|-------|--------|-------|
| NXP i.MX8M Mini | ARM Cortex-A53 | 4 | 1.8 GHz | Supported | Entry tier |
| NXP i.MX8M Plus | ARM Cortex-A72 | 4 | 2.0 GHz | Supported | Mid tier |
| Qualcomm SA8155P | ARM Cortex-A78 | 8 | 2.4 GHz | Supported | Premium tier |
| TI TDA4VM (J721E) | ARM Cortex-A72 | 2 | 2.0 GHz | Supported | Mid tier |
| Renesas R-Car H3 | ARM Cortex-A57 | 4 | 1.5 GHz | Planned | Mid tier |

### 2.2 Supported Operating Systems

| OS | Version | Kernel | Status |
|----|---------|--------|--------|
| Yocto Linux | 4.0 (Kirkstone) | 5.10+ | Supported |
| Yocto Linux | 4.3 (Nanbield) | 6.1+ | Supported |
| Android Automotive | 13 | 5.15+ | Planned |
| AGL (Automotive Grade Linux) | 16.0 | 6.1+ | Planned |

## 3. Storage Performance Testing Results

### 3.1 Test Methodology

All storage benchmarks performed using `fio` with the following parameters:
- Block sizes: 4K (random), 128K (sequential)
- Queue depth: 32
- Duration: 60 seconds per test
- Direct I/O enabled
- 3 runs averaged

### 3.2 Storage Benchmark Results

| Metric | eUFS 3.1 (Samsung) | eMMC 5.1 (Micron) | SD Card U3 (SanDisk) | Target |
|--------|-------------------|-------------------|---------------------|--------|
| Seq Read (MB/s) | 1,850 | 310 | 92 | >= 80 |
| Seq Write (MB/s) | 820 | 95 | 32 | >= 25 |
| Rand Read 4K (IOPS) | 47,200 | 7,500 | 2,800 | >= 2,000 |
| Rand Write 4K (IOPS) | 36,500 | 2,200 | 520 | >= 400 |
| Read Latency p99 (us) | 180 | 850 | 2,400 | <= 5,000 |
| Write Latency p99 (us) | 350 | 3,200 | 12,000 | <= 15,000 |

### 3.3 Application-Level Storage Performance

| Operation | eUFS 3.1 | eMMC 5.1 | SD Card U3 | Target |
|-----------|----------|----------|------------|--------|
| DB query (simple, p99) | 0.5 ms | 2 ms | 8 ms | < 10 ms |
| DB query (complex, p99) | 2 ms | 8 ms | 25 ms | < 50 ms |
| DB write (single row) | 0.3 ms | 1.5 ms | 5 ms | < 10 ms |
| DB write (batch 100) | 5 ms | 20 ms | 80 ms | < 100 ms |
| Log write (per line) | 0.01 ms | 0.05 ms | 0.2 ms | < 1 ms |
| Config file read | 0.1 ms | 0.5 ms | 2 ms | < 5 ms |

### 3.4 Storage Recommendations

| Tier | Recommended Storage | Rationale |
|------|-------------------|-----------|
| Entry | eMMC 5.1 (16 GB) | Cost-effective, meets minimum targets |
| Mid | eUFS 3.1 (32 GB) | Better write performance for logging |
| Premium | eUFS 3.1 (64 GB) | Full performance, space for map data |
| Development | SD Card U3 (32 GB) | Convenient for flashing, meets minimums |

## 4. CAN Bus Compatibility

| Interface | Controller | Protocol | Max Bitrate | Status |
|-----------|-----------|----------|-------------|--------|
| SocketCAN (can0) | MCP2515 | CAN 2.0B | 1 Mbps | Supported |
| SocketCAN (can0) | SJA1000 | CAN 2.0B | 1 Mbps | Supported |
| SocketCAN (can0) | MCAN (TI) | CAN FD | 8 Mbps | Supported |
| SocketCAN (can0) | FlexCAN (NXP) | CAN FD | 8 Mbps | Supported |

## 5. GPS Module Compatibility

| Module | Protocol | Interface | Update Rate | Status |
|--------|----------|----------|-------------|--------|
| u-blox NEO-M8N | UBX + NMEA | UART | 10 Hz | Supported |
| u-blox NEO-M9N | UBX + NMEA | UART/I2C | 25 Hz | Supported |
| Quectel L76K | NMEA | UART | 10 Hz | Supported |
| MediaTek MT3333 | NMEA | UART | 10 Hz | Planned |

## 6. Audio Hardware Compatibility

| DSP | Interface | Channels | Sample Rate | Status |
|-----|----------|----------|-------------|--------|
| TI TAS6424 | I2S | 4 | 48 kHz | Supported |
| NXP SAF775x | SPI | 8 | 96 kHz | Supported |
| Qualcomm WCD9380 | SLIMbus | 8 | 192 kHz | Planned |

## 7. Environmental Limits

| Parameter | Operating Range | Storage Range | Test Standard |
|-----------|----------------|---------------|---------------|
| Temperature | -20C to +70C | -40C to +85C | ISO 16750-4 |
| Humidity | 10% to 90% RH | 5% to 95% RH | ISO 16750-4 |
| Vibration | 5-500 Hz, 3g | N/A | ISO 16750-3 |
| Shock | 50g, 6 ms | 100g, 6 ms | ISO 16750-3 |
| Altitude | 0-5000 m | 0-15000 m | ISO 16750-4 |
