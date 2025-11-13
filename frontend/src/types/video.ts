/**
 * Video file metadata
 */
export interface VideoMetadata {
  url: string;
  path: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  duration?: number;
}

/**
 * Video upload response
 */
export interface UploadResponse {
  url: string;
  path: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
}

/**
 * Video player state
 */
export interface VideoPlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
}
