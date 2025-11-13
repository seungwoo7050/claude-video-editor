import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

/**
 * WebSocket message types
 */
export interface WSMessage {
  type: 'progress' | 'complete' | 'error' | 'ping' | 'pong';
  data?: unknown;
}

/**
 * Progress data
 */
export interface ProgressData {
  operationId: string;
  operation: 'trim' | 'split' | 'process' | 'upload';
  progress: number; // 0-100
  message?: string;
}

/**
 * WebSocket service for real-time communication
 * Based on Arena60 M1.6 pattern
 */
export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);

      console.log(`WebSocket client connected: ${clientId}`);
      console.log(`Total clients: ${this.clients.size}`);

      // Send welcome message
      this.send(ws, {
        type: 'ping',
        data: { clientId, message: 'Connected to VrewCraft WebSocket' },
      });

      // Handle messages from client
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          this.handleMessage(clientId, ws, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
        console.log(`Total clients: ${this.clients.size}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    // Start ping interval to keep connections alive
    this.startPingInterval();
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(clientId: string, ws: WebSocket, message: WSMessage): void {
    switch (message.type) {
      case 'ping':
        this.send(ws, { type: 'pong', data: { timestamp: Date.now() } });
        break;
      case 'pong':
        // Client responded to ping
        break;
      default:
        console.log(`Unknown message type from ${clientId}:`, message.type);
    }
  }

  /**
   * Send message to a specific client
   */
  private send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast progress to all clients
   */
  broadcastProgress(data: ProgressData): void {
    const message: WSMessage = {
      type: 'progress',
      data,
    };

    this.broadcast(message);
  }

  /**
   * Broadcast completion message
   */
  broadcastComplete(operationId: string, result: unknown): void {
    const message: WSMessage = {
      type: 'complete',
      data: { operationId, result },
    };

    this.broadcast(message);
  }

  /**
   * Broadcast error message
   */
  broadcastError(operationId: string, error: string): void {
    const message: WSMessage = {
      type: 'error',
      data: { operationId, error },
    };

    this.broadcast(message);
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * Send ping to all clients periodically
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((ws, clientId) => {
        if (ws.readyState === WebSocket.OPEN) {
          this.send(ws, { type: 'ping', data: { timestamp: Date.now() } });
        } else {
          // Remove dead connections
          this.clients.delete(clientId);
        }
      });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Close all connections
   */
  close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.clients.forEach((ws) => {
      ws.close();
    });

    this.wss.close();
  }
}
