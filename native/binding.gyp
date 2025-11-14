{
  "targets": [
    {
      "target_name": "video_processor",
      "sources": [
        "src/video_processor.cpp",
        "src/thumbnail_extractor.cpp",
        "src/metadata_analyzer.cpp",
        "src/memory_pool.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "include"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "cflags_cc": [ "-std=c++17", "-Wall", "-Wextra" ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        ["OS=='linux'", {
          "libraries": [
            "-lavformat",
            "-lavcodec",
            "-lavutil",
            "-lswscale"
          ],
          "cflags_cc": [ "-std=c++17", "-Wall", "-Wextra", "-pthread" ]
        }],
        ["OS=='mac'", {
          "libraries": [
            "-lavformat",
            "-lavcodec",
            "-lavutil",
            "-lswscale"
          ],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.15",
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17"
          }
        }]
      ]
    }
  ]
}
