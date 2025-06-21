# Test Organization

This document describes the current test files and their organization in the AutoMarket project.

## Test Directory Structure

```
tests/
├── providers/          # Provider-specific tests
├── composition/        # Video composition tests  
├── assets/            # Asset loading and role tests
└── integration/       # Full integration tests
```

## Current Test Files (Root Level)

The following test files are currently in the project root and should be organized:

### Provider Tests
- `test-together-*.ts` - Together.ai provider tests
- `test-openrouter-*.ts` - OpenRouter provider tests  
- `test-replicate-*.ts` - Replicate provider tests
- `test-falai-*.ts` - FAL.ai provider tests

### Video Composition Tests
- `test-video-composition-*.ts` - Video composition tests
- `test-super-composition.ts` - Complex composition tests
- `test-concatenation-*.ts` - Video concatenation tests
- `test-ffmpeg-*.ts` - FFMPEG functionality tests

### Asset Tests
- `test-image-*.ts` - Image asset tests
- `test-asset-*.ts` - General asset loading tests

### Integration Tests
- `test-delegation-*.ts` - Provider delegation tests
- `test-full-*.ts` - Full pipeline tests

## Test Cleanup Needed

Many test files in the root are experimental or outdated. The following should be:

1. **Moved to tests/ directory** - Organized by category
2. **Consolidated** - Multiple similar test files should be combined
3. **Removed** - Obsolete test files should be deleted
4. **Updated** - Tests should reflect current architecture

## Recommended Actions

1. Move relevant tests to `tests/` directory structure
2. Remove experimental/debug test files
3. Consolidate related test files
4. Update test imports to match new structure
5. Create proper test suites in package.json

## Test Scripts

Add these scripts to package.json:
```json
{
  "scripts": {
    "test": "vitest",
    "test:providers": "vitest tests/providers",
    "test:composition": "vitest tests/composition", 
    "test:assets": "vitest tests/assets",
    "test:integration": "vitest tests/integration",
    "test:coverage": "vitest --coverage"
  }
}
```
