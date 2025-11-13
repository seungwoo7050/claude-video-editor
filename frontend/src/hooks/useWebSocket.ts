import { useEffect, useState, useCallback, useRef } from 'react';

interface ProgressData {
  operationId: string;
  operation: string;
  progress: number;
  message?: string;
}

interface WSMessage {
  type: 'progress' | 'complete' | 'error' | 'ping' | 'pong';
  data?: unknown;
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
              break;
            case 'error':
              break;
            case 'ping':
              // Respond to ping
              socket.send(JSON.stringify({ type: 'pong' }));
              break;
          }
        } catch {
          // Ignore parse errors
        }
      };

      socket.onclose = () => {
        setConnected(false);

        // Attempt to reconnect after 3 seconds
        reconnectTimeout.current = window.setTimeout(() => {
          // eslint-disable-next-line react-hooks/immutability
          connect();
        }, 3000);
      };

      socket.onerror = () => {
        // Error handling is done in onclose
      };

      ws.current = socket;
    } catch {
      // Connection error
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
