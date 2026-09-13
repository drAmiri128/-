/**
 * WebSocket Client Implementation (Frontend)
 * Robust, resilient real-time event client with backoff reconnect and offline safety.
 */

import { WebSocketEventType, WebSocketEnvelope } from './types';
import { apiClient } from '../api/apiClient';

type EventHandler<T = any> = (payload: T) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 8;
  private reconnectTimer: any = null;
  private isExplicitlyClosed = false;
  private isConnecting = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[WebSocket Client] Browser online event detected. Attempting reconnect...');
        this.reconnectAttempts = 0;
        this.connect();
      });
    }
  }

  /**
   * Initializes WebSocket connection to the backend
   */
  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.isConnecting = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log('[WebSocket Client] Connecting to:', wsUrl);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('[WebSocket Client] Connected successfully.');

        // Authenticate if JWT token exists in current session
        this.authenticateWithStoredToken();
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const envelope: WebSocketEnvelope = JSON.parse(event.data);
          this.handleIncomingEnvelope(envelope);
        } catch {
          // Discard malformed frames safely
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        console.log('[WebSocket Client] Connection closed.');
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        this.isConnecting = false;
        console.warn('[WebSocket Client] Connection notice (offline or unavailable):', err);
        // Error will trigger onclose where reconnect logic sits safely
      };
    } catch (err) {
      this.isConnecting = false;
      console.warn('[WebSocket Client] Failed to create WebSocket connection:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedules a reconnect attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed || this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket Client] Max reconnect attempts reached. Waiting for next network event or manual call.');
      return;
    }

    this.reconnectAttempts++;
    // Backoff intervals: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`[WebSocket Client] Scheduling reconnect attempt #${this.reconnectAttempts} in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Authenticate active connection using the stored or passed JWT token
   */
  public authenticate(token: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'AUTH',
        token,
      }));
    }
  }

  private authenticateWithStoredToken(): void {
    const token = apiClient.getToken();
    if (token) {
      this.authenticate(token);
    }
  }

  /**
   * Subscribe to a specific real-time event
   * Returns an unsubscribe callback for clean component unmounting
   */
  public on<T = any>(event: WebSocketEventType, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);

    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Unsubscribe from a specific real-time event
   */
  public off(event: WebSocketEventType, handler: EventHandler): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Routes incoming messages to registered listeners
   */
  private handleIncomingEnvelope(envelope: WebSocketEnvelope): void {
    const { event, payload } = envelope;

    if (event === 'AUTH_SUCCESS') {
      console.log('[WebSocket Client] Authentication confirmed for socket.');
      return;
    }

    if (event === 'PONG') {
      return;
    }

    console.log(`[WebSocket Client] Event received: ${event}`);
    const handlers = this.listeners.get(event);
    if (handlers && handlers.size > 0) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[WebSocket Client] Error in handler for event ${event}:`, err);
        }
      }
    }
  }

  /**
   * Graceful disconnect
   */
  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsClient = new WebSocketClient();
