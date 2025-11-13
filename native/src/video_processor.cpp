#include <napi.h>

// Placeholder function for video processing
Napi::String GetVersion(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "0.0.1");
}

// Initialize the addon
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "getVersion"),
              Napi::Function::New(env, GetVersion));
  return exports;
}

NODE_API_MODULE(video_processor, Init)
