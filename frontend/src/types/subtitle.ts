/**
 * Subtitle definition
 */
export interface Subtitle {
  id: string;
  text: string;
  startTime: number;
  duration: number;
}

/**
 * Subtitle add/edit params
 */
export interface SubtitleParams {
  filename: string;
  subtitles: Subtitle[];
  speed?: number;
}

/**
 * Speed change params
 */
export interface SpeedParams {
  filename: string;
  speed: number;
}
