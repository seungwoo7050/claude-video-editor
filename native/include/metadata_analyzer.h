#ifndef METADATA_ANALYZER_H
#define METADATA_ANALYZER_H

#include "ffmpeg_raii.h"
#include <string>
#include <vector>
#include <map>

namespace vrewcraft {

/**
 * Video metadata extraction using FFmpeg C API
 * Target: < 100ms for any video size
 */
class MetadataAnalyzer {
public:
  MetadataAnalyzer() = default;
  ~MetadataAnalyzer() = default;

  /**
   * Video stream metadata
   */
  struct VideoStreamInfo {
    std::string codec_name;
    std::string codec_long_name;
    int width;
    int height;
    int64_t bitrate;
    double fps;
    std::string pixel_format;
    int64_t nb_frames;
  };

  /**
   * Audio stream metadata
   */
  struct AudioStreamInfo {
    std::string codec_name;
    std::string codec_long_name;
    int sample_rate;
    int channels;
    int64_t bitrate;
    std::string channel_layout;
  };

  /**
   * Container format metadata
   */
  struct FormatInfo {
    std::string format_name;
    std::string format_long_name;
    double duration_sec;
    int64_t size_bytes;
    int64_t bitrate;
    int nb_streams;
    std::map<std::string, std::string> metadata;
  };

  /**
   * Complete video metadata
   */
  struct VideoMetadata {
    FormatInfo format;
    std::vector<VideoStreamInfo> video_streams;
    std::vector<AudioStreamInfo> audio_streams;
  };

  /**
   * Extract complete metadata from video file
   *
   * @param video_path Path to video file
   * @return VideoMetadata structure
   * @throws std::runtime_error on error
   */
  VideoMetadata extract_metadata(const std::string& video_path);

  /**
   * Check if codec is supported
   *
   * @param codec_name Codec name (e.g., "h264", "hevc", "vp9", "av1")
   * @return true if supported
   */
  static bool is_codec_supported(const std::string& codec_name);

private:
  /**
   * Get codec name from ID
   */
  static std::string get_codec_name(enum AVCodecID codec_id);

  /**
   * Get pixel format name
   */
  static std::string get_pixel_format_name(enum AVPixelFormat pix_fmt);
};

} // namespace vrewcraft

#endif // METADATA_ANALYZER_H
