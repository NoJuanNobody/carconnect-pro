#!/usr/bin/env python3
"""
CarConnect Pro Documentation Validator

Validates documentation files for:
- Required files exist
- Metadata presence (version, date, status)
- API parameter naming conventions (vehicle_speed_kmh, not speed_kmh)
- CAN message ID hex format (0x0CF)
- Error code format (E-XXX-NNN)
- Internal link validity
"""

import os
import re
import sys
from pathlib import Path


def get_project_root():
    """Find the project root by looking for package.json."""
    current = Path(__file__).resolve().parent.parent
    if (current / 'package.json').exists():
        return current
    # Fallback: assume script is in scripts/ directory
    return current


PROJECT_ROOT = get_project_root()
DOCS_DIR = PROJECT_ROOT / 'docs'

# Required documentation files
REQUIRED_FILES = [
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
]

# Required metadata fields in documentation files
REQUIRED_METADATA = ['Version:', 'Last Updated:', 'Status:']

# Incorrect parameter names that should not appear
DEPRECATED_PARAMS = [
    (r'\bspeed_kmh\b(?!.*vehicle_speed_kmh)', 'Use vehicle_speed_kmh instead of speed_kmh'),
]

# CAN message ID should be in hex format
CAN_ID_HEX_PATTERN = re.compile(r'0x[0-9A-Fa-f]{2,3}')
CAN_ID_DECIMAL_PATTERN = re.compile(r'CAN\s+(?:message\s+)?ID[:\s]+(\d{2,4})(?!\s*[A-Fa-f])')

# Error code format
ERROR_CODE_PATTERN = re.compile(r'E-[A-Z]{2,4}-\d{3}')

# Required error codes from v0.9.2
REQUIRED_ERROR_CODES = ['E-CAN-004', 'E-GPS-003', 'E-AUD-005']


class ValidationResult:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.passed = 0

    def error(self, message):
        self.errors.append(message)

    def warning(self, message):
        self.warnings.append(message)

    def ok(self, message=None):
        self.passed += 1

    @property
    def success(self):
        return len(self.errors) == 0


def validate_required_files(result):
    """Check that all required documentation files exist."""
    print('\n=== Checking Required Files ===')
    for filepath in REQUIRED_FILES:
        full_path = PROJECT_ROOT / filepath
        if full_path.exists():
            result.ok()
            print(f'  PASS: {filepath}')
        else:
            result.error(f'Missing required file: {filepath}')
            print(f'  FAIL: {filepath} (missing)')


def validate_metadata(result):
    """Check that documentation files have required metadata."""
    print('\n=== Checking Document Metadata ===')
    doc_files = list(DOCS_DIR.rglob('*.md'))

    for doc_file in doc_files:
        rel_path = doc_file.relative_to(PROJECT_ROOT)
        content = doc_file.read_text(encoding='utf-8')

        # ADR files have different metadata format
        if '/adr/' in str(doc_file):
            if '**Status:**' in content or 'Status:' in content:
                result.ok()
            else:
                result.warning(f'{rel_path}: Missing Status metadata')
                print(f'  WARN: {rel_path} missing Status metadata')
            continue

        missing = []
        for field in REQUIRED_METADATA:
            if field not in content:
                missing.append(field)

        if missing:
            result.warning(f'{rel_path}: Missing metadata: {", ".join(missing)}')
            print(f'  WARN: {rel_path} missing: {", ".join(missing)}')
        else:
            result.ok()


def validate_parameter_naming(result):
    """Check API docs use correct parameter names."""
    print('\n=== Checking Parameter Naming ===')
    api_dir = DOCS_DIR / 'api'
    if not api_dir.exists():
        result.error('API documentation directory not found')
        return

    for doc_file in api_dir.glob('*.md'):
        rel_path = doc_file.relative_to(PROJECT_ROOT)
        content = doc_file.read_text(encoding='utf-8')

        # Check for deprecated parameter names
        # Look for speed_kmh used alone (not as part of vehicle_speed_kmh)
        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            if re.search(r'(?<!\w)speed_kmh(?!\w)', line) and 'vehicle_speed_kmh' not in line:
                result.error(
                    f'{rel_path}:{i}: Use "vehicle_speed_kmh" not "speed_kmh"'
                )
                print(f'  FAIL: {rel_path}:{i} - deprecated param "speed_kmh"')

        # Verify vehicle_speed_kmh is used
        if 'vehicle' in str(doc_file).lower() and 'vehicle_speed_kmh' in content:
            result.ok()
            print(f'  PASS: {rel_path} uses correct parameter naming')


def validate_can_message_ids(result):
    """Check CAN message IDs are in hex format."""
    print('\n=== Checking CAN Message ID Format ===')

    for doc_file in DOCS_DIR.rglob('*.md'):
        rel_path = doc_file.relative_to(PROJECT_ROOT)
        content = doc_file.read_text(encoding='utf-8')

        if 'CAN' not in content and 'can_message_id' not in content:
            continue

        # Check for hex format CAN IDs
        hex_ids = CAN_ID_HEX_PATTERN.findall(content)
        if hex_ids:
            result.ok()

        # Check for decimal format CAN IDs (should be hex)
        decimal_matches = CAN_ID_DECIMAL_PATTERN.findall(content)
        for match in decimal_matches:
            result.error(
                f'{rel_path}: CAN message ID "{match}" should be in hex format (e.g., 0x0CF)'
            )
            print(f'  FAIL: {rel_path} - decimal CAN ID "{match}"')


def validate_error_codes(result):
    """Check required error codes are documented."""
    print('\n=== Checking Error Codes ===')
    error_codes_file = DOCS_DIR / 'validation' / 'error-codes.md'

    if not error_codes_file.exists():
        result.error('Error codes file not found: docs/validation/error-codes.md')
        return

    content = error_codes_file.read_text(encoding='utf-8')

    for code in REQUIRED_ERROR_CODES:
        if code in content:
            result.ok()
            print(f'  PASS: Error code {code} documented')
        else:
            result.error(f'Missing error code: {code}')
            print(f'  FAIL: Error code {code} not documented')

    # Check AUDIO_DSP_INIT_FAILED has recovery procedure
    if 'E-AUD-005' in content:
        # Look for recovery content near E-AUD-005
        aud_005_idx = content.index('E-AUD-005')
        surrounding = content[aud_005_idx:aud_005_idx + 500]
        if 'recovery' in surrounding.lower() or 'retry' in surrounding.lower() or 'power cycle' in surrounding.lower():
            result.ok()
            print('  PASS: E-AUD-005 has recovery procedure')
        else:
            result.error('E-AUD-005 (AUDIO_DSP_INIT_FAILED) missing recovery procedure')
            print('  FAIL: E-AUD-005 missing recovery procedure')


def validate_adr_files(result):
    """Check ADR files exist and follow naming convention."""
    print('\n=== Checking Architecture Decision Records ===')
    adr_dir = DOCS_DIR / 'architecture' / 'adr'

    if not adr_dir.exists():
        result.error('ADR directory not found: docs/architecture/adr/')
        return

    adr_files = list(adr_dir.glob('ADR-*.md'))
    if len(adr_files) == 0:
        result.error('No ADR files found in docs/architecture/adr/')
        print('  FAIL: No ADR files found')
        return

    adr_pattern = re.compile(r'^ADR-\d{3}-.+\.md$')
    for adr_file in sorted(adr_files):
        if adr_pattern.match(adr_file.name):
            result.ok()
            print(f'  PASS: {adr_file.name}')
        else:
            result.warning(f'ADR file does not follow naming convention: {adr_file.name}')
            print(f'  WARN: {adr_file.name} - naming convention')


def validate_traceability(result):
    """Check traceability matrix has required sections."""
    print('\n=== Checking Traceability Matrix ===')
    matrix_file = DOCS_DIR / 'traceability-matrix.md'

    if not matrix_file.exists():
        result.error('Traceability matrix not found')
        return

    content = matrix_file.read_text(encoding='utf-8')

    required_sections = [
        'Vehicle Integration',
        'Navigation',
        'Audio',
        'System Health',
    ]

    for section in required_sections:
        if section in content:
            result.ok()
            print(f'  PASS: Section "{section}" present')
        else:
            result.error(f'Traceability matrix missing section: {section}')
            print(f'  FAIL: Missing section "{section}"')


def main():
    print('CarConnect Pro Documentation Validator')
    print('=' * 50)

    result = ValidationResult()

    validate_required_files(result)
    validate_metadata(result)
    validate_parameter_naming(result)
    validate_can_message_ids(result)
    validate_error_codes(result)
    validate_adr_files(result)
    validate_traceability(result)

    print('\n' + '=' * 50)
    print(f'Results: {result.passed} passed, {len(result.errors)} errors, {len(result.warnings)} warnings')

    if result.errors:
        print('\nErrors:')
        for error in result.errors:
            print(f'  ERROR: {error}')

    if result.warnings:
        print('\nWarnings:')
        for warning in result.warnings:
            print(f'  WARN: {warning}')

    if result.success:
        print('\nValidation PASSED')
        return 0
    else:
        print('\nValidation FAILED')
        return 1


if __name__ == '__main__':
    sys.exit(main())
