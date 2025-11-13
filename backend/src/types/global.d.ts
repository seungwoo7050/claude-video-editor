import { WebSocketService } from '../ws/websocket.service';

declare global {
  // eslint-disable-next-line no-var
  var wsService: WebSocketService | undefined;
}

export {};
