/**
 * Metadata Extraction Load Test
 * Target: < 100ms for any video size
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const VIDEO_PATHS = process.env.VIDEO_PATHS
  ? process.env.VIDEO_PATHS.split(',')
  : [
      '/app/uploads/test-video.mp4',
      '/app/uploads/test-video-2.mp4',
      '/app/uploads/test-video-3.mp4',
    ];
const NUM_ITERATIONS = parseInt(process.env.NUM_ITERATIONS || '50', 10);

/**
 * Make metadata extraction request
 */
async function extractMetadata(videoPath) {
  const startTime = performance.now();

  try {
    const response = await axios.post(`${BASE_URL}/api/metadata`, {
      videoPath,
    }, {
      timeout: 10000, // 10 second timeout
    });

    const duration = performance.now() - startTime;

    return {
      success: true,
      duration,
      metadata: response.data.metadata,
      videoPath,
    };
  } catch (error) {
    const duration = performance.now() - startTime;

    return {
      success: false,
      duration,
      error: error.message,
      videoPath,
    };
  }
}

/**
 * Run load test
 */
async function runLoadTest() {
  console.log('='.repeat(60));
  console.log('Metadata Extraction Load Test');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Video Paths: ${VIDEO_PATHS.join(', ')}`);
  console.log(`Iterations per video: ${NUM_ITERATIONS}`);
  console.log('='.repeat(60));
  console.log('');

  const results = [];
  let completed = 0;

  const testStartTime = performance.now();

  // Test each video file
  for (const videoPath of VIDEO_PATHS) {
    console.log(`Testing: ${videoPath}`);

    const videoResults = [];

    for (let i = 0; i < NUM_ITERATIONS; i++) {
      const result = await extractMetadata(videoPath);

      videoResults.push(result);
      completed++;

      if (!result.success) {
        console.error(`  ✗ Iteration ${i + 1} failed: ${result.error}`);
      } else if ((i + 1) % 10 === 0) {
        console.log(`  ✓ Completed ${i + 1}/${NUM_ITERATIONS} iterations`);
      }
    }

    results.push({
      videoPath,
      results: videoResults,
    });

    console.log('');
  }

  const testDuration = performance.now() - testStartTime;

  // Analyze results
  console.log('='.repeat(60));
  console.log('Results');
  console.log('='.repeat(60));

  const summaries = results.map(({ videoPath, results: videoResults }) => {
    const successfulResults = videoResults.filter(r => r.success);

    if (successfulResults.length === 0) {
      return {
        videoPath,
        success: false,
        error: 'All requests failed',
      };
    }

    const durations = successfulResults.map(r => r.duration).sort((a, b) => a - b);

    const min = durations[0];
    const max = durations[durations.length - 1];
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p50 = durations[Math.floor(durations.length * 0.50)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    // Get metadata info from first successful request
    const sampleMetadata = successfulResults[0].metadata;
    const duration = sampleMetadata?.format?.durationSec || 0;
    const size = sampleMetadata?.format?.sizeBytes || 0;

    return {
      videoPath,
      success: true,
      videoInfo: {
        duration: duration.toFixed(1) + 's',
        size: (size / 1024 / 1024).toFixed(2) + 'MB',
        codec: sampleMetadata?.videoStreams?.[0]?.codecName || 'unknown',
      },
      metrics: {
        total: videoResults.length,
        successful: successfulResults.length,
        failed: videoResults.length - successfulResults.length,
        min,
        avg,
        p50,
        p95,
        p99,
        max,
      },
      kpiMet: max < 100, // Target: < 100ms for any video size
    };
  });

  // Print summary for each video
  console.log('');
  console.log('Per-Video Results:');
  console.log('');

  for (const summary of summaries) {
    if (!summary.success) {
      console.log(`✗ ${summary.videoPath}`);
      console.log(`  Error: ${summary.error}`);
      console.log('');
      continue;
    }

    const kpiStatus = summary.kpiMet ? '✓ PASS' : '✗ FAIL';

    console.log(`${summary.videoPath}`);
    console.log(`  Video Info:`);
    console.log(`    Duration:        ${summary.videoInfo.duration}`);
    console.log(`    Size:            ${summary.videoInfo.size}`);
    console.log(`    Codec:           ${summary.videoInfo.codec}`);
    console.log(`  Performance:`);
    console.log(`    Successful:      ${summary.metrics.successful}/${summary.metrics.total}`);
    console.log(`    Min:             ${summary.metrics.min.toFixed(2)}ms`);
    console.log(`    Average:         ${summary.metrics.avg.toFixed(2)}ms`);
    console.log(`    p50:             ${summary.metrics.p50.toFixed(2)}ms`);
    console.log(`    p95:             ${summary.metrics.p95.toFixed(2)}ms`);
    console.log(`    p99:             ${summary.metrics.p99.toFixed(2)}ms`);
    console.log(`    Max:             ${summary.metrics.max.toFixed(2)}ms`);
    console.log(`  KPI Status:        ${kpiStatus} (Target: max < 100ms)`);
    console.log('');
  }

  // Overall summary
  const allKpisMet = summaries.every(s => s.success && s.kpiMet);

  console.log('='.repeat(60));
  console.log('Overall Summary:');
  console.log(`  Total Videos:      ${VIDEO_PATHS.length}`);
  console.log(`  Total Requests:    ${completed}`);
  console.log(`  Test Duration:     ${(testDuration / 1000).toFixed(2)}s`);
  console.log(`  All KPIs Met:      ${allKpisMet ? '✓ YES' : '✗ NO'}`);
  console.log('='.repeat(60));

  // Save results to JSON
  const resultsSummary = {
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: BASE_URL,
      videoPaths: VIDEO_PATHS,
      numIterations: NUM_ITERATIONS,
    },
    testDurationMs: testDuration,
    summaries,
    allKpisMet,
  };

  const resultsFile = './metadata-load-test-results.json';
  fs.writeFileSync(resultsFile, JSON.stringify(resultsSummary, null, 2));
  console.log(`Results saved to: ${resultsFile}`);
  console.log('');

  process.exit(allKpisMet ? 0 : 1);
}

// Run the load test
runLoadTest().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});
