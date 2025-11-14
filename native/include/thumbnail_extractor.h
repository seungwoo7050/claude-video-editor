#ifndef THUMBNAIL_EXTRACTOR_H
#define THUMBNAIL_EXTRACTOR_H

#include "ffmpeg_raii.h"
#include "memory_pool.h"
#include <string>
#include <vector>
#include <memory>

namespace vrewcraft {

/**
 * High-performance thumbnail extractor using FFmpeg C API
 * Target: p99 < 50ms per extraction
 */
class ThumbnailExtractor {
public:
  ThumbnailExtractor();
  ~ThumbnailExtractor() = default;

  /**
   * Extract thumbnail from video at specified timestamp
   *
   * @param video_path Path to video file
   * @param timestamp_sec Timestamp in seconds
   * @param width Target width (0 = keep original)
   * @param height Target height (0 = keep original)
   * @return JPEG data as vector of bytes
   * @throws std::runtime_error on error
   */
  std::vector<uint8_t> extract_thumbnail(
    const std::string& video_path,
    double timestamp_sec,
    int width = 0,
    int height = 0
  );

  /**
   * Get performance statistics
   */
  struct Stats {
    size_t total_extractions;
    double avg_duration_ms;
    size_t cache_hits;
    size_t cache_misses;
  };
  Stats get_stats() const;

private:
  /**
   * Open video file and find video stream
   */
  struct VideoContext {
    AVFormatContextPtr format_ctx;
    AVCodecContextPtr codec_ctx;
    int video_stream_index;
    AVRational time_base;
  };
  VideoContext open_video(const std::string& video_path);

  /**
   * Seek to timestamp and decode frame
   */
  AVFramePtr seek_and_decode(VideoContext& ctx, double timestamp_sec);

  /**
   * Convert frame to RGB and encode as JPEG
   */
  std::vector<uint8_t> frame_to_jpeg(AVFrame* frame, int target_width, int target_height);

  std::unique_ptr<AVFramePool> frame_pool_;

  // Performance tracking
  mutable std::mutex stats_mutex_;
  size_t total_extractions_;
  double total_duration_ms_;
  size_t cache_hits_;
  size_t cache_misses_;
};

} // namespace vrewcraft

#endif // THUMBNAIL_EXTRACTOR_H
