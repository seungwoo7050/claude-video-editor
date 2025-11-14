/**
 * Thumbnail Extraction Load Test
 * Target: p99 < 50ms with 100 concurrent requests
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const VIDEO_PATH = process.env.VIDEO_PATH || '/app/uploads/test-video.mp4';
const NUM_REQUESTS = parseInt(process.env.NUM_REQUESTS || '100', 10);
const CONCURRENT = parseInt(process.env.CONCURRENT || '10', 10);

/**
 * Generate test timestamps
 */
function generateTimestamps(count, maxDuration = 60) {
  const timestamps = [];
  for (let i = 0; i < count; i++) {
    timestamps.push(Math.random() * maxDuration);
  }
  return timestamps;
}

/**
 * Make thumbnail extraction request
 */
async function extractThumbnail(videoPath, timestamp, width = 320, height = 180) {
  const startTime = performance.now();

  try {
    const response = await axios.post(`${BASE_URL}/api/thumbnail`, {
      videoPath,
      timestamp,
      width,
      height,
    }, {
      timeout: 30000, // 30 second timeout
      responseType: 'arraybuffer',
    });

    const duration = performance.now() - startTime;

    return {
      success: true,
      duration,
      size: response.data.length,
      timestamp,
    };
  } catch (error) {
    const duration = performance.now() - startTime;

    return {
      success: false,
      duration,
      error: error.message,
      timestamp,
    };
  }
}

/**
 * Run load test with concurrency control
 */
async function runLoadTest() {
  console.log('='.repeat(60));
  console.log('Thumbnail Extraction Load Test');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Video Path: ${VIDEO_PATH}`);
  console.log(`Total Requests: ${NUM_REQUESTS}`);
  console.log(`Concurrent Requests: ${CONCURRENT}`);
  console.log('='.repeat(60));
  console.log('');

  const timestamps = generateTimestamps(NUM_REQUESTS);
  const results = [];

  let completed = 0;
  let errors = 0;

  const testStartTime = performance.now();

  // Process requests in batches to control concurrency
  for (let i = 0; i < timestamps.length; i += CONCURRENT) {
    const batch = timestamps.slice(i, i + CONCURRENT);

    const batchPromises = batch.map(timestamp =>
      extractThumbnail(VIDEO_PATH, timestamp).then(result => {
        completed++;
        if (!result.success) {
          errors++;
          console.error(`✗ Request ${completed} failed: ${result.error}`);
        } else if (completed % 10 === 0) {
          console.log(`✓ Completed ${completed}/${NUM_REQUESTS} requests`);
        }
        return result;
      })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  const testDuration = performance.now() - testStartTime;

  // Analyze results
  console.log('');
  console.log('='.repeat(60));
  console.log('Results');
  console.log('='.repeat(60));

  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  if (successfulResults.length === 0) {
    console.log('✗ All requests failed!');
    process.exit(1);
  }

  const durations = successfulResults.map(r => r.duration).sort((a, b) => a - b);

  const p50 = durations[Math.floor(durations.length * 0.50)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const min = durations[0];
  const max = durations[durations.length - 1];
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

  console.log('');
  console.log('Performance Metrics:');
  console.log(`  Total Requests:    ${NUM_REQUESTS}`);
  console.log(`  Successful:        ${successfulResults.length} (${(successfulResults.length / NUM_REQUESTS * 100).toFixed(1)}%)`);
  console.log(`  Failed:            ${failedResults.length}`);
  console.log(`  Test Duration:     ${(testDuration / 1000).toFixed(2)}s`);
  console.log(`  Requests/sec:      ${(NUM_REQUESTS / (testDuration / 1000)).toFixed(2)}`);
  console.log('');
  console.log('Latency Distribution:');
  console.log(`  Min:               ${min.toFixed(2)}ms`);
  console.log(`  Average:           ${avg.toFixed(2)}ms`);
  console.log(`  p50:               ${p50.toFixed(2)}ms`);
  console.log(`  p95:               ${p95.toFixed(2)}ms`);
  console.log(`  p99:               ${p99.toFixed(2)}ms ${p99 < 50 ? '✓' : '✗'}`);
  console.log(`  Max:               ${max.toFixed(2)}ms`);
  console.log('');

  // KPI Check
  const TARGET_P99 = 50; // 50ms
  const kpiMet = p99 < TARGET_P99;

  console.log('KPI Status:');
  console.log(`  Target:            p99 < ${TARGET_P99}ms`);
  console.log(`  Actual:            p99 = ${p99.toFixed(2)}ms`);
  console.log(`  Status:            ${kpiMet ? '✓ PASS' : '✗ FAIL'}`);
  console.log('');

  // Save results to JSON
  const resultsSummary = {
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: BASE_URL,
      videoPath: VIDEO_PATH,
      numRequests: NUM_REQUESTS,
      concurrent: CONCURRENT,
    },
    metrics: {
      totalRequests: NUM_REQUESTS,
      successful: successfulResults.length,
      failed: failedResults.length,
      testDurationMs: testDuration,
      requestsPerSecond: NUM_REQUESTS / (testDuration / 1000),
      latency: {
        min,
        avg,
        p50,
        p95,
        p99,
        max,
      },
    },
    kpiMet,
    target: { p99: TARGET_P99 },
  };

  const resultsFile = './thumbnail-load-test-results.json';
  fs.writeFileSync(resultsFile, JSON.stringify(resultsSummary, null, 2));
  console.log(`Results saved to: ${resultsFile}`);
  console.log('='.repeat(60));

  process.exit(kpiMet ? 0 : 1);
}

// Run the load test
runLoadTest().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});
