/**
 * CarConnect Pro - Architecture Compliance Tests
 *
 * Validates that documentation, architecture decisions, and API documentation
 * meet the required standards for the CarConnect Pro project.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs'); // eslint-disable-line no-unused-vars

/**
 * Helper: Read file content or return null if not found.
 */
function readFile(relativePath) {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Helper: Check if a file exists.
 */
function fileExists(relativePath) {
  return fs.existsSync(path.join(PROJECT_ROOT, relativePath));
}

/**
 * Helper: List files matching a glob-like pattern in a directory.
 */
function listFiles(dirPath, extension = '.md') {
  const fullDir = path.join(PROJECT_ROOT, dirPath);
  try {
    return fs.readdirSync(fullDir)
      .filter((f) => f.endsWith(extension))
      .map((f) => path.join(dirPath, f));
  } catch {
    return [];
  }
}

// ============================================================
// Test Suite: Required Documentation Files
// ============================================================
describe('Required Documentation Files', () => {
  const requiredFiles = [
    'docs/architecture/system-overview.md',
    'docs/architecture/component-diagram.md',
    'docs/architecture/security.md',
    'docs/architecture/scalability.md',
    'docs/api/vehicle-integration.md',
    'docs/api/navigation-api.md',
    'docs/api/system-health-api.md',
    'docs/deployment/deployment-guide.md',
    'docs/deployment/rollback-procedures.md',
    'docs/deployment/pre-production-checklist.md',
    'docs/validation/validation-pipeline.md',
    'docs/validation/environment-compatibility.md',
    'docs/validation/error-codes.md',
    'docs/traceability-matrix.md',
    'CHANGELOG.md',
  ];

  test.each(requiredFiles)('%s exists', (filePath) => {
    expect(fileExists(filePath)).toBe(true);
  });
});

// ============================================================
// Test Suite: Architecture Decision Records
// ============================================================
describe('Architecture Decision Records', () => {
  test('ADR directory exists', () => {
    expect(fileExists('docs/architecture/adr')).toBe(true);
  });

  test('at least 3 ADR files exist', () => {
    const adrFiles = listFiles('docs/architecture/adr');
    expect(adrFiles.length).toBeGreaterThanOrEqual(3);
  });

  test('ADR files follow naming convention (ADR-NNN-description.md)', () => {
    const adrFiles = listFiles('docs/architecture/adr');
    const pattern = /^ADR-\d{3}-.+\.md$/;

    for (const file of adrFiles) {
      const fileName = path.basename(file);
      expect(fileName).toMatch(pattern);
    }
  });

  test('ADR files contain Status field', () => {
    const adrFiles = listFiles('docs/architecture/adr');

    for (const file of adrFiles) {
      const content = readFile(file);
      expect(content).not.toBeNull();
      expect(content).toMatch(/Status:/i);
    }
  });

  test('ADR files contain required sections', () => {
    const adrFiles = listFiles('docs/architecture/adr');
    const requiredSections = ['Context', 'Decision', 'Consequences'];

    for (const file of adrFiles) {
      const content = readFile(file);
      expect(content).not.toBeNull();

      for (const section of requiredSections) {
        expect(content).toMatch(new RegExp(`##\\s+${section}`, 'i'));
      }
    }
  });
});

// ============================================================
// Test Suite: Document Metadata and Versioning
// ============================================================
describe('Document Metadata and Versioning', () => {
  const docsWithMetadata = [
    'docs/architecture/system-overview.md',
    'docs/architecture/component-diagram.md',
    'docs/architecture/security.md',
    'docs/architecture/scalability.md',
    'docs/api/vehicle-integration.md',
    'docs/api/navigation-api.md',
    'docs/api/system-health-api.md',
    'docs/deployment/deployment-guide.md',
    'docs/deployment/rollback-procedures.md',
    'docs/deployment/pre-production-checklist.md',
    'docs/validation/validation-pipeline.md',
    'docs/validation/environment-compatibility.md',
    'docs/validation/error-codes.md',
  ];

  test.each(docsWithMetadata)('%s has version metadata', (filePath) => {
    const content = readFile(filePath);
    expect(content).not.toBeNull();
    expect(content).toMatch(/Version:\*{0,2}\s*\d+\.\d+\.\d+/i);
  });

  test.each(docsWithMetadata)('%s has last updated date', (filePath) => {
    const content = readFile(filePath);
    expect(content).not.toBeNull();
    expect(content).toMatch(/Last Updated:\*{0,2}\s*\d{4}-\d{2}-\d{2}/i);
  });

  test.each(docsWithMetadata)('%s has status field', (filePath) => {
    const content = readFile(filePath);
    expect(content).not.toBeNull();
    expect(content).toMatch(/Status:\*{0,2}\s*(Approved|Draft|Review|Deprecated)/i);
  });
});

// ============================================================
// Test Suite: API Documentation Standards
// ============================================================
describe('API Documentation Standards', () => {
  test('Vehicle integration API uses vehicle_speed_kmh parameter', () => {
    const content = readFile('docs/api/vehicle-integration.md');
    expect(content).not.toBeNull();
    expect(content).toContain('vehicle_speed_kmh');
  });

  test('Vehicle integration API does not use deprecated speed_kmh alone', () => {
    const content = readFile('docs/api/vehicle-integration.md');
    expect(content).not.toBeNull();

    // Split into lines and check each line
    const lines = content.split('\n');
    for (const line of lines) {
      // If a line contains speed_kmh, it must also contain vehicle_speed_kmh
      if (/(?<!\w)speed_kmh(?!\w)/.test(line)) {
        expect(line).toContain('vehicle_speed_kmh');
      }
    }
  });

  test('CAN message IDs use hex format (0x prefix)', () => {
    const content = readFile('docs/api/vehicle-integration.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/0x[0-9A-Fa-f]{2,3}/);
  });

  test('Vehicle integration API has request/response examples', () => {
    const content = readFile('docs/api/vehicle-integration.md');
    expect(content).not.toBeNull();
    expect(content).toContain('```json');
    expect(content).toMatch(/Response.*200/i);
  });

  test('Navigation API has request/response examples', () => {
    const content = readFile('docs/api/navigation-api.md');
    expect(content).not.toBeNull();
    expect(content).toContain('```json');
    expect(content).toMatch(/Response.*200/i);
  });

  test('System Health API has request/response examples', () => {
    const content = readFile('docs/api/system-health-api.md');
    expect(content).not.toBeNull();
    expect(content).toContain('```json');
    expect(content).toMatch(/Response.*200/i);
  });

  test('API docs include error response examples', () => {
    const vehicleApi = readFile('docs/api/vehicle-integration.md');
    const navApi = readFile('docs/api/navigation-api.md');

    expect(vehicleApi).toMatch(/Error Response/i);
    expect(navApi).toMatch(/Error Response/i);
  });
});

// ============================================================
// Test Suite: Error Codes Documentation
// ============================================================
describe('Error Codes Documentation', () => {
  const requiredErrorCodes = [
    { code: 'E-CAN-004', name: 'CAN_TIMEOUT' },
    { code: 'E-GPS-003', name: 'GPS_COLD_START' },
    { code: 'E-AUD-005', name: 'AUDIO_DSP_INIT_FAILED' },
  ];

  test('error codes file exists', () => {
    expect(fileExists('docs/validation/error-codes.md')).toBe(true);
  });

  test.each(requiredErrorCodes)(
    'error code $code ($name) is documented',
    ({ code, name }) => {
      const content = readFile('docs/validation/error-codes.md');
      expect(content).not.toBeNull();
      expect(content).toContain(code);
      expect(content).toContain(name);
    },
  );

  test('AUDIO_DSP_INIT_FAILED (E-AUD-005) has recovery procedure', () => {
    const content = readFile('docs/validation/error-codes.md');
    expect(content).not.toBeNull();

    const idx = content.indexOf('E-AUD-005');
    expect(idx).toBeGreaterThan(-1);

    // Check that there is substantial recovery content after E-AUD-005
    const surrounding = content.substring(idx, idx + 600);
    const hasRecovery =
      /power cycle/i.test(surrounding) ||
      /retry/i.test(surrounding) ||
      /firmware/i.test(surrounding);
    expect(hasRecovery).toBe(true);
  });

  test('error codes follow format E-XXX-NNN', () => {
    const content = readFile('docs/validation/error-codes.md');
    expect(content).not.toBeNull();

    const errorCodes = content.match(/E-[A-Z]{2,4}-\d{3}/g);
    expect(errorCodes).not.toBeNull();
    expect(errorCodes.length).toBeGreaterThanOrEqual(10);
  });
});

// ============================================================
// Test Suite: Security Documentation
// ============================================================
describe('Security Architecture Documentation', () => {
  test('security document covers authentication', () => {
    const content = readFile('docs/architecture/security.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/authentication/i);
  });

  test('security document covers authorization/RBAC', () => {
    const content = readFile('docs/architecture/security.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/authorization|RBAC|role/i);
  });

  test('security document covers data protection', () => {
    const content = readFile('docs/architecture/security.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/encryption|data protection/i);
  });

  test('security document covers secure boot', () => {
    const content = readFile('docs/architecture/security.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/secure boot/i);
  });

  test('security document covers CAN bus security', () => {
    const content = readFile('docs/architecture/security.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/CAN.*security|CAN.*filter|message.*authentication/i);
  });

  test('security document has audit checklist', () => {
    const content = readFile('docs/architecture/security.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/audit.*checklist|security.*checklist/i);
  });
});

// ============================================================
// Test Suite: Deployment Documentation
// ============================================================
describe('Deployment Documentation', () => {
  test('deployment guide has build steps', () => {
    const content = readFile('docs/deployment/deployment-guide.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/build|npm install/i);
  });

  test('rollback procedures include factory reset script', () => {
    const content = readFile('docs/deployment/rollback-procedures.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/factory.reset/i);
    expect(content).toContain('#!/bin/bash');
  });

  test('factory reset script has error handling', () => {
    const content = readFile('docs/deployment/rollback-procedures.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/set -euo pipefail|error.*handling/i);
  });

  test('factory reset includes user data preservation option', () => {
    const content = readFile('docs/deployment/rollback-procedures.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/preserve.*user.*data/i);
  });

  test('factory reset includes post-reset validation', () => {
    const content = readFile('docs/deployment/rollback-procedures.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/validation|verify|health/i);
  });
});

// ============================================================
// Test Suite: Pre-Production Checklist
// ============================================================
describe('Pre-Production Validation Checklist', () => {
  test('includes hardware compatibility testing', () => {
    const content = readFile('docs/deployment/pre-production-checklist.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/hardware.*compatibility/i);
  });

  test('includes performance benchmark template', () => {
    const content = readFile('docs/deployment/pre-production-checklist.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/performance.*benchmark/i);
  });

  test('includes CAN bus verification', () => {
    const content = readFile('docs/deployment/pre-production-checklist.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/CAN.*bus.*verif|CAN.*integration/i);
  });

  test('includes thermal testing (-20C to +70C)', () => {
    const content = readFile('docs/deployment/pre-production-checklist.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/-20/);
    expect(content).toMatch(/\+?70/);
  });

  test('includes FCC compliance items', () => {
    const content = readFile('docs/deployment/pre-production-checklist.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/FCC/i);
  });

  test('includes security audit items', () => {
    const content = readFile('docs/deployment/pre-production-checklist.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/security.*audit/i);
  });
});

// ============================================================
// Test Suite: Traceability Matrix
// ============================================================
describe('Traceability Matrix', () => {
  test('traceability matrix exists', () => {
    expect(fileExists('docs/traceability-matrix.md')).toBe(true);
  });

  test('links vehicle integration features to requirements', () => {
    const content = readFile('docs/traceability-matrix.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/vehicle.*integration/i);
    expect(content).toMatch(/REQ-VEH/);
  });

  test('links navigation features to requirements', () => {
    const content = readFile('docs/traceability-matrix.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/navigation/i);
    expect(content).toMatch(/REQ-NAV/);
  });

  test('links audio features to requirements', () => {
    const content = readFile('docs/traceability-matrix.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/audio/i);
    expect(content).toMatch(/REQ-AUD/);
  });

  test('links system health features to requirements', () => {
    const content = readFile('docs/traceability-matrix.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/system.*health|health.*monitoring/i);
    expect(content).toMatch(/REQ-SYS/);
  });

  test('includes non-functional requirements', () => {
    const content = readFile('docs/traceability-matrix.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/non-functional|REQ-NFR/i);
  });

  test('maps ADRs to requirements', () => {
    const content = readFile('docs/traceability-matrix.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/ADR-001/);
    expect(content).toMatch(/ADR-002/);
  });
});

// ============================================================
// Test Suite: Scalability Documentation
// ============================================================
describe('Scalability and Extensibility', () => {
  test('documents hardware platform scaling', () => {
    const content = readFile('docs/architecture/scalability.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/hardware.*platform|platform.*scaling/i);
  });

  test('documents storage performance benchmarks', () => {
    const content = readFile('docs/architecture/scalability.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/eUFS/i);
    expect(content).toMatch(/eMMC/i);
    expect(content).toMatch(/SD Card/i);
  });

  test('documents extensibility guidelines', () => {
    const content = readFile('docs/architecture/scalability.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/extensib|plugin|adding.*new/i);
  });
});

// ============================================================
// Test Suite: Validation Pipeline
// ============================================================
describe('Validation Pipeline Documentation', () => {
  test('documents pipeline architecture', () => {
    const content = readFile('docs/validation/validation-pipeline.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/pipeline.*architecture|validation.*pipeline/i);
  });

  test('documents CI/CD integration', () => {
    const content = readFile('docs/validation/validation-pipeline.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/CI\/CD|GitHub Actions|continuous integration/i);
  });

  test('documents validation failure handling', () => {
    const content = readFile('docs/validation/validation-pipeline.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/failure.*handling|failure.*categor/i);
  });
});

// ============================================================
// Test Suite: Environment Compatibility
// ============================================================
describe('Environment Compatibility', () => {
  test('documents storage benchmark results', () => {
    const content = readFile('docs/validation/environment-compatibility.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/storage.*benchmark|benchmark.*result/i);
  });

  test('includes eUFS vs eMMC vs SD Card comparison', () => {
    const content = readFile('docs/validation/environment-compatibility.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/eUFS/);
    expect(content).toMatch(/eMMC/);
    expect(content).toMatch(/SD Card/);
  });

  test('includes read/write speed data', () => {
    const content = readFile('docs/validation/environment-compatibility.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/MB\/s|IOPS/);
  });
});

// ============================================================
// Test Suite: CHANGELOG
// ============================================================
describe('CHANGELOG', () => {
  test('CHANGELOG exists and has semantic versioning', () => {
    const content = readFile('CHANGELOG.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/semantic versioning/i);
  });

  test('CHANGELOG distinguishes deployment vs release dates', () => {
    const content = readFile('CHANGELOG.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/deployment.*date/i);
    expect(content).toMatch(/release.*date/i);
  });

  test('CHANGELOG has post-deployment entry template', () => {
    const content = readFile('CHANGELOG.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/post-deployment.*template/i);
  });
});

// ============================================================
// Test Suite: Validation Script
// ============================================================
describe('Validation Script', () => {
  test('validate-docs.py exists', () => {
    expect(fileExists('scripts/validate-docs.py')).toBe(true);
  });

  test('validate-docs.py is valid Python', () => {
    const content = readFile('scripts/validate-docs.py');
    expect(content).not.toBeNull();
    expect(content).toContain('#!/usr/bin/env python3');
    expect(content).toContain('def main');
  });
});

// ============================================================
// Test Suite: Component Diagram
// ============================================================
describe('Component Diagram', () => {
  test('includes text-based component diagrams', () => {
    const content = readFile('docs/architecture/component-diagram.md');
    expect(content).not.toBeNull();
    expect(content).toContain('```');
    expect(content).toMatch(/\+[-=]+\+/); // ASCII box drawing
  });

  test('shows major system components', () => {
    const content = readFile('docs/architecture/component-diagram.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/Vehicle/i);
    expect(content).toMatch(/Navigation/i);
    expect(content).toMatch(/Audio/i);
    expect(content).toMatch(/Health/i);
  });

  test('shows data flow between components', () => {
    const content = readFile('docs/architecture/component-diagram.md');
    expect(content).not.toBeNull();
    expect(content).toMatch(/Data Flow|Request Flow|Message Flow/i);
  });
});
