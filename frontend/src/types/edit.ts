/**
 * Trim operation parameters
 */
export interface TrimParams {
  filename: string;
  startTime: number;
  endTime: number;
}

/**
 * Split operation parameters
 */
export interface SplitParams {
  filename: string;
  splitTime: number;
}

/**
 * Processing result for edited video
 */
export interface EditResult {
  filename: string;
  path: string;
  url: string;
  size: number;
  duration?: number;
}

/**
 * Split result with two parts
 */
export interface SplitResult {
  parts: EditResult[];
}

/**
 * Processing state
 */
export interface ProcessingState {
  isProcessing: boolean;
  operation: 'trim' | 'split' | null;
  progress: number;
  error: string | null;
}
