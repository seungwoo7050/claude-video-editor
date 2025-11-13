import { useState, useRef } from 'react';
import { VideoUpload } from './components/VideoUpload';
import { VideoPlayer, VideoPlayerRef } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { ControlPanel } from './components/ControlPanel';
import { VideoMetadata } from './types/video';
import { EditResult } from './types/edit';

function App() {
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [processedVideos, setProcessedVideos] = useState<EditResult[]>([]);
  const playerRef = useRef<VideoPlayerRef>(null);

  const handleVideoUploaded = (uploadedVideo: VideoMetadata) => {
    setVideo(uploadedVideo);
    setCurrentTime(0);
    setDuration(0);
    setProcessedVideos([]);
  };

  const handleSeek = (time: number) => {
    playerRef.current?.seekTo(time);
  };

  const handleTrimComplete = (result: EditResult) => {
    setProcessedVideos([result]);
    // Convert EditResult to VideoMetadata format
    const trimmedVideo: VideoMetadata = {
      url: result.url,
      path: result.path,
      filename: result.filename,
      originalName: `Trimmed - ${video?.originalName || 'video'}`,
      size: result.size,
      mimetype: 'video/mp4',
      duration: result.duration,
    };
    setVideo(trimmedVideo);
  };

  const handleSplitComplete = (results: EditResult[]) => {
    setProcessedVideos(results);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">VrewCraft</h1>
          <p className="text-gray-400">Web-Based Video Editor</p>
          <p className="text-sm text-gray-500 mt-2">Phase 1 - MVP 1.1: Trim & Split</p>
        </header>

        <div className="space-y-6">
          {!video ? (
            <VideoUpload onVideoUploaded={handleVideoUploaded} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <VideoPlayer
                  ref={playerRef}
                  video={video}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                />
                <Timeline
                  duration={duration}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                />

                {processedVideos.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Processed Videos</h3>
                    <div className="space-y-2">
                      {processedVideos.map((pv, index) => (
                        <div
                          key={pv.filename}
                          className="flex items-center justify-between p-3 bg-gray-700 rounded"
                        >
                          <div>
                            <div className="font-medium">
                              {processedVideos.length > 1 ? `Part ${index + 1}` : 'Trimmed Video'}
                            </div>
                            <div className="text-sm text-gray-400">
                              {(pv.size / (1024 * 1024)).toFixed(2)} MB
                              {pv.duration && ` • ${Math.floor(pv.duration)}s`}
                            </div>
                          </div>
                          <a
                            href={pv.url}
                            download={pv.filename}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setVideo(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  Upload New Video
                </button>
              </div>

              <div className="lg:col-span-1">
                <ControlPanel
                  video={video}
                  duration={duration}
                  currentTime={currentTime}
                  onTrimComplete={handleTrimComplete}
                  onSplitComplete={handleSplitComplete}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
