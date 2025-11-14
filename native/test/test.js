/**
 * Test suite for VrewCraft native video processor
 */

const path = require('path');

// Try to load the native addon
let videoProcessor;
try {
  videoProcessor = require('../build/Release/video_processor.node');
  console.log('✓ Native module loaded successfully');
} catch (err) {
  console.error('✗ Failed to load native module:', err.message);
  console.error('  Make sure to run "npm run build" first');
  process.exit(1);
}

// Test 1: Get version
console.log('\n--- Test 1: Get Version ---');
try {
  const version = videoProcessor.getVersion();
  console.log('✓ Version:', version);
  if (version !== '2.0.0') {
    console.error('✗ Unexpected version:', version);
    process.exit(1);
  }
} catch (err) {
  console.error('✗ Failed to get version:', err.message);
  process.exit(1);
}

// Test 2: Create ThumbnailExtractor
console.log('\n--- Test 2: Create ThumbnailExtractor ---');
try {
  const extractor = new videoProcessor.ThumbnailExtractor();
  console.log('✓ ThumbnailExtractor created');

  // Get initial stats
  const stats = extractor.getStats();
  console.log('✓ Initial stats:', stats);

  if (stats.totalExtractions !== 0) {
    console.error('✗ Expected 0 total extractions');
    process.exit(1);
  }
} catch (err) {
  console.error('✗ Failed to create ThumbnailExtractor:', err.message);
  process.exit(1);
}

// Test 3: Create MetadataAnalyzer
console.log('\n--- Test 3: Create MetadataAnalyzer ---');
try {
  const analyzer = new videoProcessor.MetadataAnalyzer();
  console.log('✓ MetadataAnalyzer created');

  // Test codec support check
  const h264Supported = videoProcessor.MetadataAnalyzer.isCodecSupported('h264');
  console.log('✓ H.264 codec supported:', h264Supported);

  const vp9Supported = videoProcessor.MetadataAnalyzer.isCodecSupported('vp9');
  console.log('✓ VP9 codec supported:', vp9Supported);

} catch (err) {
  console.error('✗ Failed to create MetadataAnalyzer:', err.message);
  process.exit(1);
}

// Test 4: Error handling - Invalid file
console.log('\n--- Test 4: Error Handling ---');
try {
  const extractor = new videoProcessor.ThumbnailExtractor();
  const nonexistentFile = '/tmp/nonexistent-video.mp4';

  console.log('Testing with nonexistent file...');
  try {
    extractor.extractThumbnail(nonexistentFile, 0);
    console.error('✗ Should have thrown an error for nonexistent file');
    process.exit(1);
  } catch (err) {
    console.log('✓ Correctly threw error:', err.message);
  }
} catch (err) {
  console.error('✗ Error handling test failed:', err.message);
  process.exit(1);
}

// Test 5: Invalid arguments
console.log('\n--- Test 5: Invalid Arguments ---');
try {
  const extractor = new videoProcessor.ThumbnailExtractor();

  // Missing arguments
  try {
    extractor.extractThumbnail();
    console.error('✗ Should have thrown error for missing arguments');
    process.exit(1);
  } catch (err) {
    console.log('✓ Correctly threw error for missing arguments');
  }

  // Wrong type
  try {
    extractor.extractThumbnail(123, 'invalid');
    console.error('✗ Should have thrown error for invalid types');
    process.exit(1);
  } catch (err) {
    console.log('✓ Correctly threw error for invalid types');
  }
} catch (err) {
  console.error('✗ Argument validation test failed:', err.message);
  process.exit(1);
}

console.log('\n===========================================');
console.log('✓ All tests passed!');
console.log('===========================================');
console.log('\nNOTE: Full integration tests with actual video files');
console.log('      will be run in the backend test suite.');
