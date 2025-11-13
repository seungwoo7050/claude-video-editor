import path from 'path';
import { promises as fs } from 'fs';

/**
 * Storage service for managing video file storage
 */
export class StorageService {
  private uploadDir: string;

  constructor(uploadDir = 'uploads') {
    this.uploadDir = path.resolve(process.cwd(), uploadDir);
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Get upload directory path
   */
  getUploadDir(): string {
    return this.uploadDir;
  }

  /**
   * Get file path for a given filename
   */
  getFilePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }

  /**
   * Check if file exists
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      await fs.access(this.getFilePath(filename));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filename: string): Promise<void> {
    const filePath = this.getFilePath(filename);
    await fs.unlink(filePath);
  }
}
