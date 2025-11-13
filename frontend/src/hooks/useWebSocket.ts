import { useEffect, useState, useCallback, useRef } from 'react';

interface ProgressData {
  operationId: string;
  operation: string;
  progress: number;
  message?: string;
}

interface WSMessage {
  type: 'progress' | 'complete' | 'error' | 'ping' | 'pong';
  data?: any;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

/**
 * WebSocket hook for real-time communication
 */
export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);

  const connect = useCallback(() => {
    try {
      const socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'progress':
              setProgress(message.data as ProgressData);
              break;
            case 'complete':
              console.log('Operation complete:', message.data);
              break;
            case 'error':
              console.error('Operation error:', message.data);
              break;
            case 'ping':
              // Respond to ping
              socket.send(JSON.stringify({ type: 'pong' }));
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current = socket;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    connected,
    progress,
  };
}
