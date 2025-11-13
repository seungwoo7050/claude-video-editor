import { Redis } from 'ioredis';

/**
 * Redis connection and session management
 * Based on Arena60 M1.8 pattern
 */
export class RedisService {
  private client: Redis;
  private readonly SESSION_TTL = 3600; // 1 hour in seconds

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true, // Don't connect immediately
    });

    this.client.on('error', (err: Error) => {
      console.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
    });
  }

  /**
   * Set a key-value pair with TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiry = ttl || this.SESSION_TTL;
    await this.client.setex(key, expiry, value);
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set session data
   */
  async setSession(sessionId: string, data: object): Promise<void> {
    await this.set(`session:${sessionId}`, JSON.stringify(data), this.SESSION_TTL);
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<object | null> {
    const data = await this.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string): Promise<void> {
    await this.client.expire(`session:${sessionId}`, this.SESSION_TTL);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.delete(`session:${sessionId}`);
  }

  /**
   * Cache video metadata
   */
  async cacheMetadata(filename: string, metadata: object): Promise<void> {
    await this.set(`metadata:${filename}`, JSON.stringify(metadata), 3600);
  }

  /**
   * Get cached metadata
   */
  async getCachedMetadata(filename: string): Promise<object | null> {
    const data = await this.get(`metadata:${filename}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }
}

// Singleton instance
export const redis = new RedisService();
