import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { VideoMetadata, VideoPlayerState } from '../types/video';

interface VideoPlayerProps {
  video: VideoMetadata;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
}

export interface VideoPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
}

/**
 * Video player component with playback controls
 */
export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ video, onTimeUpdate, onDurationChange }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playerState, setPlayerState] = useState<VideoPlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
  });

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      const currentTime = videoElement.currentTime;
      setPlayerState((prev) => ({ ...prev, currentTime }));
      onTimeUpdate?.(currentTime);
    };

    const handleDurationChange = () => {
      const duration = videoElement.duration;
      setPlayerState((prev) => ({ ...prev, duration }));
      onDurationChange?.(duration);
    };

    const handlePlay = () => {
      setPlayerState((prev) => ({ ...prev, playing: true }));
    };

    const handlePause = () => {
      setPlayerState((prev) => ({ ...prev, playing: false }));
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('durationchange', handleDurationChange);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('durationchange', handleDurationChange);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, [onTimeUpdate, onDurationChange]);

  const togglePlay = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (playerState.playing) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const time = parseFloat(e.target.value);
    videoElement.currentTime = time;
    setPlayerState((prev) => ({ ...prev, currentTime: time }));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const volume = parseFloat(e.target.value);
    videoElement.volume = volume;
    setPlayerState((prev) => ({ ...prev, volume, muted: volume === 0 }));
  };

  const toggleMute = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const newMuted = !playerState.muted;
    videoElement.muted = newMuted;
    setPlayerState((prev) => ({ ...prev, muted: newMuted }));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    play: () => {
      videoRef.current?.play();
    },
    pause: () => {
      videoRef.current?.pause();
    },
  }));

  return (
    <div className="space-y-4">
      <div className="bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={video.url}
          className="w-full"
          onError={(e) => console.error('Video error:', e)}
        />
      </div>

      <div className="space-y-3 bg-gray-800 rounded-lg p-4">
        {/* Seek bar */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={playerState.duration || 0}
            value={playerState.currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                (playerState.currentTime / (playerState.duration || 1)) * 100
              }%, #374151 ${
                (playerState.currentTime / (playerState.duration || 1)) * 100
              }%, #374151 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatTime(playerState.currentTime)}</span>
            <span>{formatTime(playerState.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            {playerState.playing ? '⏸ Pause' : '▶ Play'}
          </button>

          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="hover:text-blue-400 transition-colors">
              {playerState.muted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={playerState.volume}
              onChange={handleVolumeChange}
              className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="text-sm text-gray-400">
            {video.originalName}
          </div>
        </div>
      </div>
    </div>
  );
});
