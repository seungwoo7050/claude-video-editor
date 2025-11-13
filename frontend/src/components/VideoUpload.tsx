import { useCallback, useState } from 'react';
import { useVideoUpload } from '../hooks/useVideoUpload';
import { VideoMetadata } from '../types/video';

interface VideoUploadProps {
  onVideoUploaded: (video: VideoMetadata) => void;
}

/**
 * Video upload component with drag & drop support
 */
export function VideoUpload({ onVideoUploaded }: VideoUploadProps) {
  const { uploadVideo, uploading, progress, error } = useVideoUpload();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    const result = await uploadVideo(file);
    if (result) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      onVideoUploaded({
        ...result,
        url: `${apiUrl}${result.url}`,
      });
    }
  }, [uploadVideo, onVideoUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="space-y-4">
            <p className="text-gray-300">Uploading... {Math.round(progress)}%</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-4xl">📹</div>
            <div>
              <p className="text-gray-300 mb-2">
                Drag & drop your video here, or click to browse
              </p>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                className="hidden"
                id="video-input"
              />
              <label
                htmlFor="video-input"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors"
              >
                Select Video
              </label>
            </div>
            <p className="text-sm text-gray-500">
              Supports MP4, MOV, AVI, MKV, WebM (max 500MB)
            </p>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500 rounded text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
