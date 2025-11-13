import { useState, useRef } from 'react';
import { VideoUpload } from './components/VideoUpload';
import { VideoPlayer, VideoPlayerRef } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { VideoMetadata } from './types/video';

function App() {
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef<VideoPlayerRef>(null);

  const handleVideoUploaded = (uploadedVideo: VideoMetadata) => {
    setVideo(uploadedVideo);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleSeek = (time: number) => {
    playerRef.current?.seekTo(time);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">VrewCraft</h1>
          <p className="text-gray-400">Web-Based Video Editor</p>
          <p className="text-sm text-gray-500 mt-2">Phase 1 - MVP 1.0: Basic Infrastructure</p>
        </header>

        <div className="space-y-6">
          {!video ? (
            <VideoUpload onVideoUploaded={handleVideoUploaded} />
          ) : (
            <>
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
              <button
                onClick={() => setVideo(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Upload New Video
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
