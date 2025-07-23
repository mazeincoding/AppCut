# OpenCut Testing Suite

This directory contains various testing tools and benchmarks for OpenCut video editor.

## Directory Structure

```
testing/
├── README.md                           # This file
├── benchmarks/                         # General benchmark tools
├── performance/                        # Video processing performance tests
│   ├── video-processing-benchmark.js   # Node.js simulation benchmark
│   └── verify-video-generation.spec.js # Video generation verification
└── webcodecs/                          # WebCodecs-specific tests
    ├── webcodecs-performance-test.html  # Real video WebCodecs vs Canvas test
    └── webcodecs-synthetic-benchmark.html # Synthetic WebCodecs benchmark
```

## Quick Start

### 1. WebCodecs Performance Test (Recommended)
**File**: `webcodecs/webcodecs-performance-test.html`
**Best for**: Testing actual performance improvement with real video files

```bash
# Open in Chrome browser (best WebCodecs support)
start chrome "testing/webcodecs/webcodecs-performance-test.html"

# Load your video file and run comparison
# Results: Shows actual Canvas vs WebCodecs performance
```

### 2. Synthetic WebCodecs Benchmark
**File**: `webcodecs/webcodecs-synthetic-benchmark.html`
**Best for**: Quick testing without needing video files

```bash
# Open in any modern browser
start "testing/webcodecs/webcodecs-synthetic-benchmark.html"

# Click "Start Benchmark" for automatic test
```

### 3. Node.js Performance Simulation
**File**: `performance/video-processing-benchmark.js`
**Best for**: Understanding processing overhead simulation

```bash
cd testing/performance
node video-processing-benchmark.js
```

## Test Results Reference

Based on actual testing with `3_us_office.mp4`:

### WebCodecs vs Canvas Performance
- **Canvas Export Time**: 6.82 seconds
- **WebCodecs Export Time**: 2.84 seconds  
- **Speed Improvement**: **2.4x faster** ✅
- **Verdict**: "GOOD! Meaningful improvement, especially for longer videos"

### Realistic Expectations
- **WebCodecs Software**: 2-3x faster than Canvas
- **WebCodecs Hardware**: 3-5x faster (with GPU acceleration)
- **WebCodecs Optimized**: 4-7x faster (best case scenario)

## Browser Compatibility

| Browser | WebCodecs Support | Recommended |
|---------|-------------------|-------------|
| Chrome 94+ | ✅ Full support | **Best choice** |
| Edge 94+ | ✅ Full support | Good |
| Firefox | ❌ Not supported | Canvas fallback |
| Safari | ⚠️ Limited support | Canvas fallback |

## Testing Guidelines

### For Development Testing
1. Use `webcodecs-performance-test.html` with real video files
2. Test with different video lengths (5s, 30s, 60s+)
3. Compare results across different browsers
4. Monitor memory usage during export

### For Performance Analysis
1. Start with short videos (5-10 seconds) for quick feedback
2. Gradually test longer videos to see scaling benefits
3. Test both software and hardware-accelerated scenarios
4. Document actual performance gains vs. expectations

### For Integration Testing
1. Verify fallback system works when WebCodecs unavailable
2. Test memory constraints (8GB limit handling)
3. Validate export quality consistency across engines
4. Test error recovery and user feedback

## Adding New Tests

### WebCodecs Tests
Place in `webcodecs/` directory:
- Browser-based HTML tests
- WebCodecs API compatibility tests
- Codec-specific performance tests

### Performance Tests  
Place in `performance/` directory:
- Node.js simulation scripts
- Memory usage benchmarks
- Processing pipeline tests

### General Benchmarks
Place in `benchmarks/` directory:
- Cross-platform comparison tools
- Algorithm performance tests
- System resource monitoring

## Notes

- **Realistic Performance**: WebCodecs provides 2-4x improvement, not 20-40x as initially claimed
- **Hardware Acceleration**: Can provide additional 2-3x boost when available
- **Memory Management**: All tests respect 8GB memory limit constraints
- **Fallback Safety**: Tests demonstrate graceful degradation when WebCodecs unavailable

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Include clear documentation in test files
3. Add test description to this README
4. Ensure tests work across supported browsers
5. Include expected results/benchmarks in comments