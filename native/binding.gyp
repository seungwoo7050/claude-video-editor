{
  "targets": [
    {
      "target_name": "video_processor",
      "sources": [
        "src/video_processor.cpp"
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
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        ["OS=='linux'", {
          "libraries": [
            "-lavformat",
            "-lavcodec",
            "-lavutil",
            "-lswscale"
          ]
        }],
        ["OS=='mac'", {
          "libraries": [
            "-lavformat",
            "-lavcodec",
            "-lavutil",
            "-lswscale"
          ]
        }]
      ]
    }
  ]
}
