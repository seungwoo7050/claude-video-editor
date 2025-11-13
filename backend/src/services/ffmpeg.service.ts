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
 * FFmpeg service for video processing operations
 */
export class FFmpegService {
  private storageService: StorageService;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
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
}
