#!/bin/bash

# Run all Phase 2 load tests

set -e

echo "======================================================================"
echo "VrewCraft Phase 2 - Performance Load Tests"
echo "======================================================================"
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
VIDEO_PATH="${VIDEO_PATH:-/app/uploads/test-video.mp4}"

echo "Configuration:"
echo "  BASE_URL:    $BASE_URL"
echo "  VIDEO_PATH:  $VIDEO_PATH"
echo ""

# Check if backend is running
echo "Checking backend health..."
if ! curl -sf "$BASE_URL/health" > /dev/null; then
  echo "✗ Backend is not reachable at $BASE_URL"
  echo "  Please start the backend and try again."
  exit 1
fi
echo "✓ Backend is running"
echo ""

# Check native module availability
echo "Checking native module..."
NATIVE_STATUS=$(curl -sf "$BASE_URL/api/thumbnail/health" | jq -r '.available')
if [ "$NATIVE_STATUS" != "true" ]; then
  echo "✗ Native module is not available"
  echo "  Please build the native addon and restart the backend."
  exit 1
fi
echo "✓ Native module is loaded"
echo ""

# Run thumbnail load test
echo "======================================================================"
echo "Test 1: Thumbnail Extraction Load Test"
echo "======================================================================"
echo ""

cd "$(dirname "$0")"

if ! node thumbnail-load-test.js; then
  echo ""
  echo "✗ Thumbnail load test FAILED"
  THUMBNAIL_PASSED=false
else
  echo ""
  echo "✓ Thumbnail load test PASSED"
  THUMBNAIL_PASSED=true
fi

echo ""
echo ""

# Run metadata load test
echo "======================================================================"
echo "Test 2: Metadata Extraction Load Test"
echo "======================================================================"
echo ""

if ! node metadata-load-test.js; then
  echo ""
  echo "✗ Metadata load test FAILED"
  METADATA_PASSED=false
else
  echo ""
  echo "✓ Metadata load test PASSED"
  METADATA_PASSED=true
fi

echo ""
echo ""

# Final summary
echo "======================================================================"
echo "Final Results"
echo "======================================================================"
echo ""
echo "Thumbnail Extraction:    $([ "$THUMBNAIL_PASSED" = true ] && echo "✓ PASS" || echo "✗ FAIL")"
echo "Metadata Extraction:     $([ "$METADATA_PASSED" = true ] && echo "✓ PASS" || echo "✗ FAIL")"
echo ""

if [ "$THUMBNAIL_PASSED" = true ] && [ "$METADATA_PASSED" = true ]; then
  echo "======================================================================"
  echo "✓ ALL PHASE 2 PERFORMANCE TESTS PASSED"
  echo "======================================================================"
  echo ""
  exit 0
else
  echo "======================================================================"
  echo "✗ SOME PHASE 2 PERFORMANCE TESTS FAILED"
  echo "======================================================================"
  echo ""
  exit 1
fi
