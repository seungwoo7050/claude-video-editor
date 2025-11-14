#include "metadata_analyzer.h"
#include <stdexcept>
#include <cstring>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/dict.h>
}

namespace vrewcraft {

MetadataAnalyzer::VideoMetadata MetadataAnalyzer::extract_metadata(const std::string& video_path) {
  VideoMetadata metadata;

  // Open input file
  AVFormatContext* fmt_ctx_raw = nullptr;
  if (avformat_open_input(&fmt_ctx_raw, video_path.c_str(), nullptr, nullptr) < 0) {
    throw std::runtime_error("Failed to open video file: " + video_path);
  }
  AVFormatContextPtr fmt_ctx(fmt_ctx_raw);

  // Retrieve stream information
  if (avformat_find_stream_info(fmt_ctx.get(), nullptr) < 0) {
    throw std::runtime_error("Failed to find stream information");
  }

  // Extract format information
  metadata.format.format_name = fmt_ctx->iformat->name ? fmt_ctx->iformat->name : "";
  metadata.format.format_long_name = fmt_ctx->iformat->long_name ? fmt_ctx->iformat->long_name : "";
  metadata.format.duration_sec = fmt_ctx->duration > 0 ? fmt_ctx->duration / static_cast<double>(AV_TIME_BASE) : 0.0;
  metadata.format.size_bytes = fmt_ctx->pb ? avio_size(fmt_ctx->pb) : 0;
  metadata.format.bitrate = fmt_ctx->bit_rate;
  metadata.format.nb_streams = fmt_ctx->nb_streams;

  // Extract container metadata
  AVDictionaryEntry* tag = nullptr;
  while ((tag = av_dict_get(fmt_ctx->metadata, "", tag, AV_DICT_IGNORE_SUFFIX))) {
    metadata.format.metadata[tag->key] = tag->value;
  }

  // Process each stream
  for (unsigned int i = 0; i < fmt_ctx->nb_streams; i++) {
    AVStream* stream = fmt_ctx->streams[i];
    AVCodecParameters* codecpar = stream->codecpar;

    if (codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
      // Video stream
      VideoStreamInfo video_info;
      video_info.codec_name = get_codec_name(codecpar->codec_id);

      const AVCodecDescriptor* desc = avcodec_descriptor_get(codecpar->codec_id);
      video_info.codec_long_name = desc ? desc->long_name : "";

      video_info.width = codecpar->width;
      video_info.height = codecpar->height;
      video_info.bitrate = codecpar->bit_rate;
      video_info.pixel_format = get_pixel_format_name(static_cast<AVPixelFormat>(codecpar->format));

      // Calculate FPS
      if (stream->avg_frame_rate.den > 0) {
        video_info.fps = av_q2d(stream->avg_frame_rate);
      } else if (stream->r_frame_rate.den > 0) {
        video_info.fps = av_q2d(stream->r_frame_rate);
      } else {
        video_info.fps = 0.0;
      }

      video_info.nb_frames = stream->nb_frames;

      metadata.video_streams.push_back(video_info);

    } else if (codecpar->codec_type == AVMEDIA_TYPE_AUDIO) {
      // Audio stream
      AudioStreamInfo audio_info;
      audio_info.codec_name = get_codec_name(codecpar->codec_id);

      const AVCodecDescriptor* desc = avcodec_descriptor_get(codecpar->codec_id);
      audio_info.codec_long_name = desc ? desc->long_name : "";

      audio_info.sample_rate = codecpar->sample_rate;
      audio_info.channels = codecpar->ch_layout.nb_channels;
      audio_info.bitrate = codecpar->bit_rate;

      // Get channel layout name
      char layout_name[256];
      av_channel_layout_describe(&codecpar->ch_layout, layout_name, sizeof(layout_name));
      audio_info.channel_layout = layout_name;

      metadata.audio_streams.push_back(audio_info);
    }
  }

  return metadata;
}

bool MetadataAnalyzer::is_codec_supported(const std::string& codec_name) {
  const AVCodec* codec = avcodec_find_decoder_by_name(codec_name.c_str());
  return codec != nullptr;
}

std::string MetadataAnalyzer::get_codec_name(enum AVCodecID codec_id) {
  const AVCodecDescriptor* desc = avcodec_descriptor_get(codec_id);
  return desc ? desc->name : "unknown";
}

std::string MetadataAnalyzer::get_pixel_format_name(enum AVPixelFormat pix_fmt) {
  const char* name = av_get_pix_fmt_name(pix_fmt);
  return name ? name : "unknown";
}

} // namespace vrewcraft
