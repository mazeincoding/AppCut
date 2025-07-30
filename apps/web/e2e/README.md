# E2E Tests for OpenCut

## Status: All Tests Working ✓
- **UI Tests**: 19/19 passing (100% success rate)
- **Performance Scripts**: 7 working scripts with comprehensive metrics
- **Test Framework**: Playwright with TypeScript support

## Quick Start

```bash
# Run all E2E tests
cd apps/web && bunx playwright test

# Run specific test suite
bunx playwright test e2e/ui-tests       # UI tests (19)
bunx playwright test e2e/ai-tests       # AI tests (6)
bunx playwright test e2e/media-tests    # Media tests (19)

# Performance testing scripts
cd e2e/video-export-tests/scripts
node audio-processing-performance-test.js
node browser-resource-usage-test.js
node concurrent-operations-test.js
node frame-rate-performance-test.js
node large-file-test.js
```

## Directory Structure

```text
e2e/
├── ui-tests/                   # UI component tests (19 ✓)
│   ├── setup-verification.spec.ts      # Environment verification (7)
│   ├── filename-validation.spec.ts     # Form validation (10)
│   ├── fullscreen-bug-test.spec.ts     # Navigation testing (1)
│   └── export-dialog-spacing.spec.ts   # Export dialog UI (1)
├── ai-tests/                   # AI video generation tests (6)
├── media-tests/                # Media processing tests (19)
├── video-export-tests/         # Export functionality & performance
│   ├── input/                  # Test video files
│   ├── output/                 # Test results and reports
│   └── scripts/                # Performance testing scripts (7 ✓)
├── performance-tests/          # Additional benchmarks
└── fixtures/                   # Test utilities and data
```

## Performance Metrics

### Audio Processing
- **Rate**: 25-32M samples/sec
- **Memory**: 5.13MB avg, 5.59MB peak
- **Quality**: 100% maintained

### Resource Monitoring
- **CPU Stress**: 99.99% detection
- **UI Response**: 26ms avg during load
- **Thermal Detection**: 19% degradation detected

### Frame Rate Analysis
- **30fps**: 14.58ms avg frame time
- **60fps**: 14.54ms avg frame time
- **Memory**: Linear scaling with resolution

### Concurrent Operations
- **Multi-export**: 3/3 successful
- **UI Response**: 89ms avg during export
- **Peak Memory**: 43.88MB

## Test Types

- **Setup Verification**: Environment and browser API checks
- **Form Validation**: Filename validation with 10 test cases
- **Navigation**: Fullscreen bug detection and recovery
- **Export Dialog**: UI spacing and functionality
- **Performance**: Audio, CPU, GPU, memory, and frame rate testing
- **Stress Testing**: Large files, concurrent operations, thermal limits

## Key Commands

```bash
# Interactive mode
bunx playwright test --ui

# Debug mode
bunx playwright test --debug

# Headed mode (see browser)
bunx playwright test --headed

# Generate report
bunx playwright show-report
```