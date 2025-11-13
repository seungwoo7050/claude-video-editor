import { useState, useEffect } from 'react';
import { VideoMetadata } from '../types/video';
import { EditResult } from '../types/edit';
import { Subtitle } from '../types/subtitle';
import { SubtitleEditor } from './SubtitleEditor';
import { useVideoEdit } from '../hooks/useVideoEdit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface EditPanelProps {
  video: VideoMetadata;
  duration: number;
  currentTime: number;
  onEditComplete?: (result: EditResult) => void;
  onSplitComplete?: (results: EditResult[]) => void;
}

/**
 * Combined editing panel for trim, split, subtitle, and speed operations
 */
export function EditPanel({
  video,
  duration,
  currentTime,
  onEditComplete,
  onSplitComplete,
}: EditPanelProps) {
  const { trimVideo, splitVideo, processing, error } = useVideoEdit();

  const [mode, setMode] = useState<'trim' | 'split' | 'subtitle'>('trim');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [splitTime, setSplitTime] = useState(0);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [speed, setSpeed] = useState(1.0);
  const [processingSubtitle, setProcessingSubtitle] = useState(false);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);

  useEffect(() => {
    if (duration > 0) {
      setTrimEnd(duration);
      setSplitTime(duration / 2);
    }
  }, [duration]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds);
    const secs = Math.floor((seconds % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTrim = async () => {
    if (trimStart >= trimEnd) {
      alert('End time must be greater than start time');
      return;
    }

    const result = await trimVideo({
      filename: video.filename,
      startTime: trimStart,
      endTime: trimEnd,
    });

    if (result && onEditComplete) {
      onEditComplete(result);
    }
  };

  const handleSplit = async () => {
    if (splitTime <= 0 || splitTime >= duration) {
      alert('Split time must be between 0 and video duration');
      return;
    }

    const result = await splitVideo({
      filename: video.filename,
      splitTime,
    });

    if (result && onSplitComplete) {
      onSplitComplete(result.parts);
    }
  };

  const handleProcess = async () => {
    if (subtitles.length === 0 && speed === 1.0) {
      alert('Add at least one subtitle or change speed');
      return;
    }

    setProcessingSubtitle(true);
    setSubtitleError(null);

    try {
      const response = await fetch(`${API_URL}/api/edit/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: video.filename,
          subtitles: subtitles.length > 0 ? subtitles : undefined,
          speed: speed !== 1.0 ? speed : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const result = await response.json();
      setProcessingSubtitle(false);

      if (onEditComplete) {
        onEditComplete(result);
      }

      // Reset state
      setSubtitles([]);
      setSpeed(1.0);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Processing failed';
      setSubtitleError(errorMsg);
      setProcessingSubtitle(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold mb-4">Video Editing</h3>

      {/* Mode Selection */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('trim')}
          className={`px-4 py-2 rounded transition-colors ${
            mode === 'trim'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ✂️ Trim
        </button>
        <button
          onClick={() => setMode('split')}
          className={`px-4 py-2 rounded transition-colors ${
            mode === 'split'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ✄ Split
        </button>
        <button
          onClick={() => setMode('subtitle')}
          className={`px-4 py-2 rounded transition-colors ${
            mode === 'subtitle'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          📝 Subtitle/Speed
        </button>
      </div>

      {/* Trim Controls */}
      {mode === 'trim' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start: {formatTime(trimStart)}
            </label>
            <div className="flex gap-2">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={trimStart}
                onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => setTrimStart(currentTime)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Current
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End: {formatTime(trimEnd)}
            </label>
            <div className="flex gap-2">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={trimEnd}
                onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => setTrimEnd(currentTime)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Current
              </button>
            </div>
          </div>

          <button
            onClick={handleTrim}
            disabled={processing}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium"
          >
            {processing ? 'Processing...' : 'Trim Video'}
          </button>
        </div>
      )}

      {/* Split Controls */}
      {mode === 'split' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Split At: {formatTime(splitTime)}
            </label>
            <div className="flex gap-2">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={splitTime}
                onChange={(e) => setSplitTime(parseFloat(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => setSplitTime(currentTime)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Current
              </button>
            </div>
          </div>

          <button
            onClick={handleSplit}
            disabled={processing}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium"
          >
            {processing ? 'Processing...' : 'Split Video'}
          </button>
        </div>
      )}

      {/* Subtitle/Speed Controls */}
      {mode === 'subtitle' && (
        <div className="space-y-4">
          {/* Speed Control */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playback Speed: {speed}x
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => setSpeed(1.0)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Reset
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {speed < 1 ? 'Slower' : speed > 1 ? 'Faster' : 'Normal'}
            </div>
          </div>

          {/* Subtitle Editor */}
          <SubtitleEditor
            subtitles={subtitles}
            currentTime={currentTime}
            onSubtitlesChange={setSubtitles}
          />

          <button
            onClick={handleProcess}
            disabled={processingSubtitle}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium"
          >
            {processingSubtitle ? 'Processing...' : 'Apply Changes'}
          </button>
        </div>
      )}

      {/* Error Display */}
      {(error || subtitleError) && (
        <div className="p-3 bg-red-500/10 border border-red-500 rounded text-red-400 text-sm">
          {error || subtitleError}
        </div>
      )}
    </div>
  );
}
