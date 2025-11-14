/**
 * Native Video Processing Service
 * Uses C++ native addon for high-performance operations
 */

import path from 'path';
import fs from 'fs';

// Type definitions for native module
interface ThumbnailExtractorStats {
  totalExtractions: number;
  avgDurationMs: number;
  cacheHits: number;
  cacheMisses: number;
}

interface VideoStreamInfo {
  codecName: string;
  codecLongName: string;
  width: number;
  height: number;
  bitrate: number;
  fps: number;
  pixelFormat: string;
  nbFrames: number;
}

interface AudioStreamInfo {
  codecName: string;
  codecLongName: string;
  sampleRate: number;
  channels: number;
  bitrate: number;
  channelLayout: string;
}

interface FormatInfo {
  formatName: string;
  formatLongName: string;
  durationSec: number;
  sizeBytes: number;
  bitrate: number;
  nbStreams: number;
  metadata: Record<string, string>;
}

interface VideoMetadata {
  format: FormatInfo;
  videoStreams: VideoStreamInfo[];
  audioStreams: AudioStreamInfo[];
}

interface MetadataAnalyzerConstructor {
  new (): {
    extractMetadata(videoPath: string): VideoMetadata;
  };
  isCodecSupported(codecName: string): boolean;
}

interface NativeVideoProcessor {
  getVersion(): string;
  ThumbnailExtractor: new () => {
    extractThumbnail(videoPath: string, timestamp: number, width?: number, height?: number): Buffer;
    getStats(): ThumbnailExtractorStats;
  };
  MetadataAnalyzer: MetadataAnalyzerConstructor;
}

class NativeVideoService {
  private nativeModule: NativeVideoProcessor | null = null;
  private thumbnailExtractor: InstanceType<NativeVideoProcessor['ThumbnailExtractor']> | null = null;
  private metadataAnalyzer: InstanceType<NativeVideoProcessor['MetadataAnalyzer']> | null = null;

  constructor() {
    this.loadNativeModule();
  }

  /**
   * Load the native module
   * Attempts to load from multiple possible paths
   */
  private loadNativeModule(): void {
    const possiblePaths = [
      // Development: relative to backend
      path.join(__dirname, '../../../native/build/Release/video_processor.node'),
      // Docker: native module in /app/native
      '/app/native/build/Release/video_processor.node',
      // Local node_modules
      path.join(__dirname, '../../node_modules/vrewcraft-native/build/Release/video_processor.node'),
    ];

    for (const modulePath of possiblePaths) {
      try {
        if (fs.existsSync(modulePath)) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          this.nativeModule = require(modulePath);
          console.log(`[NativeVideoService] Loaded native module from: ${modulePath}`);
          console.log(`[NativeVideoService] Version: ${this.nativeModule!.getVersion()}`);

          // Initialize instances
          this.thumbnailExtractor = new this.nativeModule!.ThumbnailExtractor();
          this.metadataAnalyzer = new this.nativeModule!.MetadataAnalyzer();

          return;
        }
      } catch (err) {
        console.warn(`[NativeVideoService] Failed to load from ${modulePath}:`, err);
      }
    }

    console.warn('[NativeVideoService] Native module not found. Running without C++ acceleration.');
    console.warn('[NativeVideoService] Thumbnail and metadata features will be disabled.');
  }

  /**
   * Check if native module is available
   */
  public isAvailable(): boolean {
    return this.nativeModule !== null;
  }

  /**
   * Get native module version
   */
  public getVersion(): string {
    if (!this.nativeModule) {
      throw new Error('Native module not available');
    }
    return this.nativeModule.getVersion();
  }

  /**
   * Extract thumbnail from video at specified timestamp
   *
   * @param videoPath Path to video file
   * @param timestamp Timestamp in seconds
   * @param width Target width (0 = keep original)
   * @param height Target height (0 = keep original)
   * @returns RGB image data as Buffer
   */
  public async extractThumbnail(
    videoPath: string,
    timestamp: number,
    width: number = 0,
    height: number = 0
  ): Promise<Buffer> {
    if (!this.thumbnailExtractor) {
      throw new Error('Native module not available');
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const startTime = Date.now();
    try {
      const buffer = this.thumbnailExtractor.extractThumbnail(videoPath, timestamp, width, height);
      const duration = Date.now() - startTime;

      console.log(`[NativeVideoService] Extracted thumbnail in ${duration}ms`);

      return buffer;
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[NativeVideoService] Failed to extract thumbnail (${duration}ms):`, err);
      throw err;
    }
  }

  /**
   * Get thumbnail extractor statistics
   */
  public getThumbnailStats(): ThumbnailExtractorStats {
    if (!this.thumbnailExtractor) {
      throw new Error('Native module not available');
    }
    return this.thumbnailExtractor.getStats();
  }

  /**
   * Extract video metadata
   *
   * @param videoPath Path to video file
   * @returns Complete video metadata
   */
  public async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    if (!this.metadataAnalyzer) {
      throw new Error('Native module not available');
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const startTime = Date.now();
    try {
      const metadata = this.metadataAnalyzer.extractMetadata(videoPath);
      const duration = Date.now() - startTime;

      console.log(`[NativeVideoService] Extracted metadata in ${duration}ms`);

      return metadata;
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[NativeVideoService] Failed to extract metadata (${duration}ms):`, err);
      throw err;
    }
  }

  /**
   * Check if codec is supported
   */
  public static isCodecSupported(codecName: string): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nativeModule = require(
        path.join(__dirname, '../../../native/build/Release/video_processor.node')
      ) as NativeVideoProcessor;
      return nativeModule.MetadataAnalyzer.isCodecSupported(codecName);
    } catch (err) {
      console.warn('[NativeVideoService] Cannot check codec support:', err);
      return false;
    }
  }
}

// Singleton instance
export const nativeVideoService = new NativeVideoService();

// Export class for static methods
export { NativeVideoService };

export type {
  VideoMetadata,
  VideoStreamInfo,
  AudioStreamInfo,
  FormatInfo,
  ThumbnailExtractorStats,
};
