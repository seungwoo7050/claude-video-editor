import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { promises as fs } from 'fs';
import { StorageService } from './storage.service.js';

/**
 * Result of a video processing operation
 */
export interface ProcessingResult {
  filename: string;
  path: string;
  url: string;
  size: number;
  duration?: number;
}

/**
 * Subtitle definition
 */
export interface Subtitle {
  text: string;
  startTime: number;
  duration: number;
}

/**
 * FFmpeg service for video processing operations
 */
export class FFmpegService {
  private storageService: StorageService;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Get WebSocket service for progress broadcasting
   */
  private getWsService() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (global as any).wsService;
  }

  /**
   * Emit progress via WebSocket
   */
  private emitProgress(operationId: string, operation: string, progress: number, message?: string) {
    const ws = this.getWsService();
    if (ws) {
      ws.broadcastProgress({
        operationId,
        operation,
        progress,
        message,
      });
    }
  }

  /**
   * Trim video from start time to end time
   * @param inputPath - Path to input video file
   * @param startTime - Start time in seconds
   * @param duration - Duration in seconds (or end time if endTime provided)
   * @param endTime - End time in seconds (optional, if provided duration is ignored)
   * @returns Processing result with output file info
   */
  async trimVideo(
    inputPath: string,
    startTime: number,
    duration?: number,
    endTime?: number
  ): Promise<ProcessingResult> {
    const outputFilename = `trim-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(inputPath)}`;
    const outputPath = this.storageService.getFilePath(outputFilename);

    const actualDuration = endTime !== undefined ? endTime - startTime : duration;

    if (!actualDuration || actualDuration <= 0) {
      throw new Error('Invalid duration or end time');
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(actualDuration)
        .output(outputPath);

      // Preserve original codec when possible for faster processing
      command = command
        .videoCodec('copy')
        .audioCodec('copy');

      command
        .on('end', async () => {
          try {
            const stats = await fs.stat(outputPath);
            resolve({
              filename: outputFilename,
              path: outputPath,
              url: `/videos/${outputFilename}`,
              size: stats.size,
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg trim error: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Split video at a specific time into two files
   * @param inputPath - Path to input video file
   * @param splitTime - Time in seconds to split the video
   * @returns Array of processing results for both parts
   */
  async splitVideo(inputPath: string, splitTime: number): Promise<ProcessingResult[]> {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(inputPath);

    const part1Filename = `split-part1-${timestamp}-${random}${ext}`;
    const part2Filename = `split-part2-${timestamp}-${random}${ext}`;

    const part1Path = this.storageService.getFilePath(part1Filename);
    const part2Path = this.storageService.getFilePath(part2Filename);

    // Get video duration first
    const metadata = await this.getVideoMetadata(inputPath);
    const totalDuration = metadata.duration;

    if (!totalDuration || splitTime >= totalDuration) {
      throw new Error('Invalid split time');
    }

    // Create part 1 (0 to splitTime)
    const part1Promise = new Promise<ProcessingResult>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(0)
        .setDuration(splitTime)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(part1Path)
        .on('end', async () => {
          try {
            const stats = await fs.stat(part1Path);
            resolve({
              filename: part1Filename,
              path: part1Path,
              url: `/videos/${part1Filename}`,
              size: stats.size,
              duration: splitTime,
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg split part1 error: ${err.message}`));
        })
        .run();
    });

    // Create part 2 (splitTime to end)
    const part2Promise = new Promise<ProcessingResult>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(splitTime)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(part2Path)
        .on('end', async () => {
          try {
            const stats = await fs.stat(part2Path);
            resolve({
              filename: part2Filename,
              path: part2Path,
              url: `/videos/${part2Filename}`,
              size: stats.size,
              duration: totalDuration - splitTime,
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg split part2 error: ${err.message}`));
        })
        .run();
    });

    return Promise.all([part1Promise, part2Promise]);
  }

  /**
   * Get video metadata including duration
   * @param videoPath - Path to video file
   * @returns Metadata object with duration, resolution, codec, etc.
   */
  async getVideoMetadata(videoPath: string): Promise<{
    duration: number;
    width?: number;
    height?: number;
    codec?: string;
    bitrate?: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`FFprobe error: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream?.width,
          height: videoStream?.height,
          codec: videoStream?.codec_name,
          bitrate: metadata.format.bit_rate,
        });
      });
    });
  }

  /**
   * Add subtitles to video and/or change speed
   * @param inputPath - Path to input video file
   * @param subtitles - Array of subtitles to add
   * @param speed - Playback speed (0.5 to 2.0)
   * @returns Processing result with output file info
   */
  async addSubtitlesAndSpeed(
    inputPath: string,
    subtitles: Subtitle[],
    speed?: number
  ): Promise<ProcessingResult> {
    const outputFilename = `processed-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(inputPath)}`;
    const outputPath = this.storageService.getFilePath(outputFilename);

    // Create SRT subtitle file if subtitles provided
    let subtitlePath: string | null = null;
    if (subtitles.length > 0) {
      subtitlePath = this.storageService.getFilePath(`temp-${Date.now()}.srt`);
      const srtContent = this.generateSRT(subtitles);
      await fs.writeFile(subtitlePath, srtContent, 'utf-8');
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // Apply speed filter if specified
      const filters: string[] = [];
      if (speed && speed !== 1.0) {
        // Video speed filter
        filters.push(`setpts=${1 / speed}*PTS`);
      }

      // Add subtitle filter if subtitles provided
      if (subtitlePath) {
        // Burn subtitles into video
        const escapedPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
        filters.push(`subtitles='${escapedPath}':force_style='Alignment=2,MarginV=20,FontSize=24'`);
      }

      if (filters.length > 0) {
        command = command.videoFilters(filters);
      }

      // Apply audio speed if specified
      if (speed && speed !== 1.0) {
        command = command.audioFilters([`atempo=${speed}`]);
      }

      command
        .output(outputPath)
        .on('end', async () => {
          // Clean up temp subtitle file
          if (subtitlePath) {
            try {
              await fs.unlink(subtitlePath);
            } catch {
              // Ignore cleanup errors
            }
          }

          try {
            const stats = await fs.stat(outputPath);
            resolve({
              filename: outputFilename,
              path: outputPath,
              url: `/videos/${outputFilename}`,
              size: stats.size,
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', async (err) => {
          // Clean up temp subtitle file on error
          if (subtitlePath) {
            try {
              await fs.unlink(subtitlePath);
            } catch {
              // Ignore cleanup errors
            }
          }
          reject(new Error(`FFmpeg processing error: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Generate SRT subtitle file content
   * @param subtitles - Array of subtitles
   * @returns SRT format string
   */
  private generateSRT(subtitles: Subtitle[]): string {
    return subtitles
      .map((sub, index) => {
        const start = this.formatSRTTime(sub.startTime);
        const end = this.formatSRTTime(sub.startTime + sub.duration);

        return `${index + 1}\n${start} --> ${end}\n${sub.text}\n`;
      })
      .join('\n');
  }

  /**
   * Format time in SRT format (HH:MM:SS,mmm)
   * @param seconds - Time in seconds
   * @returns SRT formatted time string
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis
      .toString()
      .padStart(3, '0')}`;
  }
}
