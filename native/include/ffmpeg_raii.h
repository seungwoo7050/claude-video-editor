#ifndef FFMPEG_RAII_H
#define FFMPEG_RAII_H

#include <memory>
extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/avutil.h>
#include <libavutil/imgutils.h>
#include <libswscale/swscale.h>
}

namespace vrewcraft {

/**
 * RAII wrapper deleters for FFmpeg structures
 * Ensures proper resource cleanup and prevents memory leaks
 */

struct AVFormatContextDeleter {
  void operator()(AVFormatContext* ctx) const {
    if (ctx) {
      avformat_close_input(&ctx);
    }
  }
};

struct AVCodecContextDeleter {
  void operator()(AVCodecContext* ctx) const {
    if (ctx) {
      avcodec_free_context(&ctx);
    }
  }
};

struct AVFrameDeleter {
  void operator()(AVFrame* frame) const {
    if (frame) {
      av_frame_free(&frame);
    }
  }
};

struct AVPacketDeleter {
  void operator()(AVPacket* pkt) const {
    if (pkt) {
      av_packet_free(&pkt);
    }
  }
};

struct SwsContextDeleter {
  void operator()(SwsContext* ctx) const {
    if (ctx) {
      sws_freeContext(ctx);
    }
  }
};

struct AVBufferDeleter {
  void operator()(uint8_t* buffer) const {
    if (buffer) {
      av_free(buffer);
    }
  }
};

// RAII wrappers using unique_ptr with custom deleters
using AVFormatContextPtr = std::unique_ptr<AVFormatContext, AVFormatContextDeleter>;
using AVCodecContextPtr = std::unique_ptr<AVCodecContext, AVCodecContextDeleter>;
using AVFramePtr = std::unique_ptr<AVFrame, AVFrameDeleter>;
using AVPacketPtr = std::unique_ptr<AVPacket, AVPacketDeleter>;
using SwsContextPtr = std::unique_ptr<SwsContext, SwsContextDeleter>;
using AVBufferPtr = std::unique_ptr<uint8_t, AVBufferDeleter>;

/**
 * Helper functions for creating RAII-wrapped FFmpeg objects
 */
inline AVFramePtr make_av_frame() {
  return AVFramePtr(av_frame_alloc());
}

inline AVPacketPtr make_av_packet() {
  return AVPacketPtr(av_packet_alloc());
}

inline AVCodecContextPtr make_codec_context(const AVCodec* codec) {
  return AVCodecContextPtr(avcodec_alloc_context3(codec));
}

} // namespace vrewcraft

#endif // FFMPEG_RAII_H
