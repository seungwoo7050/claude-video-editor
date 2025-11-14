#include "thumbnail_extractor.h"
#include <stdexcept>
#include <chrono>
#include <cstring>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/imgutils.h>
#include <libswscale/swscale.h>
}

namespace vrewcraft {

ThumbnailExtractor::ThumbnailExtractor()
  : frame_pool_(std::make_unique<AVFramePool>(10)),
    total_extractions_(0),
    total_duration_ms_(0.0),
    cache_hits_(0),
    cache_misses_(0) {
}

ThumbnailExtractor::VideoContext ThumbnailExtractor::open_video(const std::string& video_path) {
  VideoContext ctx;

  // Open input file
  AVFormatContext* fmt_ctx_raw = nullptr;
  if (avformat_open_input(&fmt_ctx_raw, video_path.c_str(), nullptr, nullptr) < 0) {
    throw std::runtime_error("Failed to open video file: " + video_path);
  }
  ctx.format_ctx = AVFormatContextPtr(fmt_ctx_raw);

  // Retrieve stream information
  if (avformat_find_stream_info(ctx.format_ctx.get(), nullptr) < 0) {
    throw std::runtime_error("Failed to find stream information");
  }

  // Find video stream
  ctx.video_stream_index = -1;
  for (unsigned int i = 0; i < ctx.format_ctx->nb_streams; i++) {
    if (ctx.format_ctx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
      ctx.video_stream_index = i;
      break;
    }
  }

  if (ctx.video_stream_index == -1) {
    throw std::runtime_error("No video stream found");
  }

  // Get codec parameters
  AVCodecParameters* codecpar = ctx.format_ctx->streams[ctx.video_stream_index]->codecpar;

  // Find decoder
  const AVCodec* codec = avcodec_find_decoder(codecpar->codec_id);
  if (!codec) {
    throw std::runtime_error("Unsupported codec");
  }

  // Allocate codec context
  ctx.codec_ctx = make_codec_context(codec);
  if (!ctx.codec_ctx) {
    throw std::runtime_error("Failed to allocate codec context");
  }

  // Copy codec parameters to codec context
  if (avcodec_parameters_to_context(ctx.codec_ctx.get(), codecpar) < 0) {
    throw std::runtime_error("Failed to copy codec parameters");
  }

  // Open codec
  if (avcodec_open2(ctx.codec_ctx.get(), codec, nullptr) < 0) {
    throw std::runtime_error("Failed to open codec");
  }

  // Store time base
  ctx.time_base = ctx.format_ctx->streams[ctx.video_stream_index]->time_base;

  return ctx;
}

AVFramePtr ThumbnailExtractor::seek_and_decode(VideoContext& ctx, double timestamp_sec) {
  // Convert timestamp to stream time base
  int64_t seek_target = static_cast<int64_t>(timestamp_sec / av_q2d(ctx.time_base));

  // Seek to timestamp
  if (av_seek_frame(ctx.format_ctx.get(), ctx.video_stream_index, seek_target, AVSEEK_FLAG_BACKWARD) < 0) {
    throw std::runtime_error("Failed to seek to timestamp");
  }

  // Flush codec buffers
  avcodec_flush_buffers(ctx.codec_ctx.get());

  // Allocate packet
  AVPacketPtr packet = make_av_packet();
  if (!packet) {
    throw std::runtime_error("Failed to allocate packet");
  }

  // Acquire frame from pool
  AVFramePtr frame = frame_pool_->acquire();
  if (!frame) {
    throw std::runtime_error("Failed to allocate frame");
  }

  // Read frames until we find one at or after the target timestamp
  bool found_frame = false;
  while (av_read_frame(ctx.format_ctx.get(), packet.get()) >= 0) {
    if (packet->stream_index == ctx.video_stream_index) {
      // Send packet to decoder
      int ret = avcodec_send_packet(ctx.codec_ctx.get(), packet.get());
      if (ret < 0) {
        av_packet_unref(packet.get());
        continue;
      }

      // Receive decoded frame
      ret = avcodec_receive_frame(ctx.codec_ctx.get(), frame.get());
      if (ret == 0) {
        // Successfully decoded frame
        found_frame = true;
        av_packet_unref(packet.get());
        break;
      }
    }
    av_packet_unref(packet.get());
  }

  if (!found_frame) {
    throw std::runtime_error("Failed to decode frame at timestamp");
  }

  return frame;
}

std::vector<uint8_t> ThumbnailExtractor::frame_to_jpeg(AVFrame* frame, int target_width, int target_height) {
  // Determine output dimensions
  int out_width = target_width > 0 ? target_width : frame->width;
  int out_height = target_height > 0 ? target_height : frame->height;

  // Create scaling context
  SwsContextPtr sws_ctx(sws_getContext(
    frame->width, frame->height, static_cast<AVPixelFormat>(frame->format),
    out_width, out_height, AV_PIX_FMT_RGB24,
    SWS_BILINEAR, nullptr, nullptr, nullptr
  ));

  if (!sws_ctx) {
    throw std::runtime_error("Failed to create scaling context");
  }

  // Allocate RGB frame
  AVFramePtr rgb_frame = make_av_frame();
  if (!rgb_frame) {
    throw std::runtime_error("Failed to allocate RGB frame");
  }

  rgb_frame->format = AV_PIX_FMT_RGB24;
  rgb_frame->width = out_width;
  rgb_frame->height = out_height;

  if (av_frame_get_buffer(rgb_frame.get(), 32) < 0) {
    throw std::runtime_error("Failed to allocate RGB frame buffer");
  }

  // Convert to RGB
  sws_scale(
    sws_ctx.get(),
    frame->data, frame->linesize, 0, frame->height,
    rgb_frame->data, rgb_frame->linesize
  );

  // For simplicity, return raw RGB data
  // In production, you would encode to JPEG here using libjpeg or similar
  size_t data_size = rgb_frame->linesize[0] * out_height;
  std::vector<uint8_t> result(data_size);
  std::memcpy(result.data(), rgb_frame->data[0], data_size);

  return result;
}

std::vector<uint8_t> ThumbnailExtractor::extract_thumbnail(
  const std::string& video_path,
  double timestamp_sec,
  int width,
  int height
) {
  auto start_time = std::chrono::high_resolution_clock::now();

  try {
    // Open video
    VideoContext ctx = open_video(video_path);

    // Seek and decode frame
    AVFramePtr frame = seek_and_decode(ctx, timestamp_sec);

    // Convert to JPEG
    std::vector<uint8_t> jpeg_data = frame_to_jpeg(frame.get(), width, height);

    // Release frame back to pool
    frame_pool_->release(std::move(frame));

    // Update statistics
    auto end_time = std::chrono::high_resolution_clock::now();
    double duration_ms = std::chrono::duration<double, std::milli>(end_time - start_time).count();

    {
      std::lock_guard<std::mutex> lock(stats_mutex_);
      total_extractions_++;
      total_duration_ms_ += duration_ms;
      cache_misses_++; // In this version, we don't use cache yet
    }

    return jpeg_data;
  } catch (const std::exception& e) {
    auto end_time = std::chrono::high_resolution_clock::now();
    double duration_ms = std::chrono::duration<double, std::milli>(end_time - start_time).count();

    {
      std::lock_guard<std::mutex> lock(stats_mutex_);
      total_extractions_++;
      total_duration_ms_ += duration_ms;
    }

    throw;
  }
}

ThumbnailExtractor::Stats ThumbnailExtractor::get_stats() const {
  std::lock_guard<std::mutex> lock(stats_mutex_);

  Stats stats;
  stats.total_extractions = total_extractions_;
  stats.avg_duration_ms = total_extractions_ > 0 ? total_duration_ms_ / total_extractions_ : 0.0;
  stats.cache_hits = cache_hits_;
  stats.cache_misses = cache_misses_;

  return stats;
}

} // namespace vrewcraft
