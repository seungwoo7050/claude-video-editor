#include <napi.h>
#include "thumbnail_extractor.h"
#include "metadata_analyzer.h"
#include <memory>

using namespace vrewcraft;

/**
 * N-API wrapper for ThumbnailExtractor
 */
class ThumbnailExtractorWrapper : public Napi::ObjectWrap<ThumbnailExtractorWrapper> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "ThumbnailExtractor", {
      InstanceMethod("extractThumbnail", &ThumbnailExtractorWrapper::ExtractThumbnail),
      InstanceMethod("getStats", &ThumbnailExtractorWrapper::GetStats),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);

    exports.Set("ThumbnailExtractor", func);
    return exports;
  }

  ThumbnailExtractorWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<ThumbnailExtractorWrapper>(info),
      extractor_(std::make_unique<ThumbnailExtractor>()) {
  }

private:
  Napi::Value ExtractThumbnail(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Validate arguments
    if (info.Length() < 2) {
      Napi::TypeError::New(env, "Expected at least 2 arguments").ThrowAsJavaScriptException();
      return env.Null();
    }

    if (!info[0].IsString()) {
      Napi::TypeError::New(env, "Argument 0 must be a string (video path)").ThrowAsJavaScriptException();
      return env.Null();
    }

    if (!info[1].IsNumber()) {
      Napi::TypeError::New(env, "Argument 1 must be a number (timestamp)").ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string video_path = info[0].As<Napi::String>().Utf8Value();
    double timestamp = info[1].As<Napi::Number>().DoubleValue();

    int width = 0;
    int height = 0;

    if (info.Length() >= 3 && info[2].IsNumber()) {
      width = info[2].As<Napi::Number>().Int32Value();
    }

    if (info.Length() >= 4 && info[3].IsNumber()) {
      height = info[3].As<Napi::Number>().Int32Value();
    }

    try {
      // Extract thumbnail
      std::vector<uint8_t> thumbnail_data = extractor_->extract_thumbnail(video_path, timestamp, width, height);

      // Create Node.js Buffer
      Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, thumbnail_data.data(), thumbnail_data.size());

      return buffer;
    } catch (const std::exception& e) {
      Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
      return env.Null();
    }
  }

  Napi::Value GetStats(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    ThumbnailExtractor::Stats stats = extractor_->get_stats();

    Napi::Object result = Napi::Object::New(env);
    result.Set("totalExtractions", Napi::Number::New(env, stats.total_extractions));
    result.Set("avgDurationMs", Napi::Number::New(env, stats.avg_duration_ms));
    result.Set("cacheHits", Napi::Number::New(env, stats.cache_hits));
    result.Set("cacheMisses", Napi::Number::New(env, stats.cache_misses));

    return result;
  }

  std::unique_ptr<ThumbnailExtractor> extractor_;
};

/**
 * N-API wrapper for MetadataAnalyzer
 */
class MetadataAnalyzerWrapper : public Napi::ObjectWrap<MetadataAnalyzerWrapper> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "MetadataAnalyzer", {
      InstanceMethod("extractMetadata", &MetadataAnalyzerWrapper::ExtractMetadata),
      StaticMethod("isCodecSupported", &MetadataAnalyzerWrapper::IsCodecSupported),
    });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);

    exports.Set("MetadataAnalyzer", func);
    return exports;
  }

  MetadataAnalyzerWrapper(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<MetadataAnalyzerWrapper>(info),
      analyzer_(std::make_unique<MetadataAnalyzer>()) {
  }

private:
  Napi::Value ExtractMetadata(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
      Napi::TypeError::New(env, "Expected string argument (video path)").ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string video_path = info[0].As<Napi::String>().Utf8Value();

    try {
      MetadataAnalyzer::VideoMetadata metadata = analyzer_->extract_metadata(video_path);

      Napi::Object result = Napi::Object::New(env);

      // Format info
      Napi::Object format_obj = Napi::Object::New(env);
      format_obj.Set("formatName", Napi::String::New(env, metadata.format.format_name));
      format_obj.Set("formatLongName", Napi::String::New(env, metadata.format.format_long_name));
      format_obj.Set("durationSec", Napi::Number::New(env, metadata.format.duration_sec));
      format_obj.Set("sizeBytes", Napi::Number::New(env, metadata.format.size_bytes));
      format_obj.Set("bitrate", Napi::Number::New(env, metadata.format.bitrate));
      format_obj.Set("nbStreams", Napi::Number::New(env, metadata.format.nb_streams));

      // Metadata tags
      Napi::Object metadata_obj = Napi::Object::New(env);
      for (const auto& pair : metadata.format.metadata) {
        metadata_obj.Set(pair.first, Napi::String::New(env, pair.second));
      }
      format_obj.Set("metadata", metadata_obj);

      result.Set("format", format_obj);

      // Video streams
      Napi::Array video_streams = Napi::Array::New(env, metadata.video_streams.size());
      for (size_t i = 0; i < metadata.video_streams.size(); i++) {
        const auto& vs = metadata.video_streams[i];
        Napi::Object vs_obj = Napi::Object::New(env);
        vs_obj.Set("codecName", Napi::String::New(env, vs.codec_name));
        vs_obj.Set("codecLongName", Napi::String::New(env, vs.codec_long_name));
        vs_obj.Set("width", Napi::Number::New(env, vs.width));
        vs_obj.Set("height", Napi::Number::New(env, vs.height));
        vs_obj.Set("bitrate", Napi::Number::New(env, vs.bitrate));
        vs_obj.Set("fps", Napi::Number::New(env, vs.fps));
        vs_obj.Set("pixelFormat", Napi::String::New(env, vs.pixel_format));
        vs_obj.Set("nbFrames", Napi::Number::New(env, vs.nb_frames));
        video_streams[i] = vs_obj;
      }
      result.Set("videoStreams", video_streams);

      // Audio streams
      Napi::Array audio_streams = Napi::Array::New(env, metadata.audio_streams.size());
      for (size_t i = 0; i < metadata.audio_streams.size(); i++) {
        const auto& as = metadata.audio_streams[i];
        Napi::Object as_obj = Napi::Object::New(env);
        as_obj.Set("codecName", Napi::String::New(env, as.codec_name));
        as_obj.Set("codecLongName", Napi::String::New(env, as.codec_long_name));
        as_obj.Set("sampleRate", Napi::Number::New(env, as.sample_rate));
        as_obj.Set("channels", Napi::Number::New(env, as.channels));
        as_obj.Set("bitrate", Napi::Number::New(env, as.bitrate));
        as_obj.Set("channelLayout", Napi::String::New(env, as.channel_layout));
        audio_streams[i] = as_obj;
      }
      result.Set("audioStreams", audio_streams);

      return result;
    } catch (const std::exception& e) {
      Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
      return env.Null();
    }
  }

  static Napi::Value IsCodecSupported(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
      Napi::TypeError::New(env, "Expected string argument (codec name)").ThrowAsJavaScriptException();
      return env.Null();
    }

    std::string codec_name = info[0].As<Napi::String>().Utf8Value();
    bool supported = MetadataAnalyzer::is_codec_supported(codec_name);

    return Napi::Boolean::New(env, supported);
  }

  std::unique_ptr<MetadataAnalyzer> analyzer_;
};

/**
 * Get version
 */
Napi::String GetVersion(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "2.0.0");
}

/**
 * Initialize the addon
 */
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "getVersion"),
              Napi::Function::New(env, GetVersion));

  ThumbnailExtractorWrapper::Init(env, exports);
  MetadataAnalyzerWrapper::Init(env, exports);

  return exports;
}

NODE_API_MODULE(video_processor, Init)
