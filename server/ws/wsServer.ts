import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { getJwtSecret, AuthUserPayload } from '../middleware/auth';
import {
  WebSocketEventType,
  WebSocketEnvelope,
  MatamModeToggledPayload,
  SettingsChangedPayload,
  NewContentPublishedPayload,
  NewSubmissionAlertPayload,
  SubmissionEvaluatedPayload,
  ClientInboundMessage,
} from './types';

interface WsClientContext {
  ws: WebSocket;
  isAlive: boolean;
  user?: AuthUserPayload;
  ip?: string;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WsClientContext> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  public init(httpServer: HttpServer): void {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const client: WsClientContext = {
        ws,
        isAlive: true,
        ip: req.socket.remoteAddress,
      };

      this.clients.add(client);
      console.log(`[WebSocket] Client connected. Total active: ${this.clients.size}`);

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (rawData: string) => {
        try {
          const dataStr = rawData.toString();
          const message: ClientInboundMessage = JSON.parse(dataStr);
          this.handleClientMessage(client, message);
        } catch {
          // Safe discard of non-JSON / malformed frames
          console.warn('[WebSocket] Received unparseable client frame. Discarding.');
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
        console.log(`[WebSocket] Client disconnected. Total active: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.warn('[WebSocket Error] Socket error:', err.message);
        this.clients.delete(client);
      });
    });

    // Heartbeat check every 30 seconds to clean up dead / hung connections
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          console.log('[WebSocket] Terminating inactive / hung client connection.');
          client.ws.terminate();
          this.clients.delete(client);
          continue;
        }

        client.isAlive = false;
        try {
          client.ws.ping();
        } catch {
          client.ws.terminate();
          this.clients.delete(client);
        }
      }
    }, 30000);

    console.log('[WebSocket] Server initialized on path /ws');
  }

  /**
   * Processes inbound client messages.
   * STRICT SECURITY RULE: Clients can ONLY send AUTH or PING.
   * Under no circumstances is any client message broadcasted or forwarded.
   */
  private handleClientMessage(client: WsClientContext, message: ClientInboundMessage): void {
    const msgType = (message.type || message.event || '').toUpperCase();

    // 1. Authentication Handshake
    if (msgType === 'AUTH') {
      const token = message.token || message.payload?.token;
      if (!token || typeof token !== 'string') {
        this.sendEnvelope(client.ws, 'AUTH_ERROR', { message: 'توکن نامعتبر است.' });
        return;
      }

      try {
        const decoded = jwt.verify(token, getJwtSecret()) as AuthUserPayload;
        client.user = decoded;
        console.log(`[WebSocket Auth] Authenticated socket for role: ${decoded.role}, userId: ${decoded.id}`);
        this.sendEnvelope(client.ws, 'AUTH_SUCCESS', {
          role: decoded.role,
          userId: decoded.id,
          name: decoded.name,
        });
      } catch {
        console.warn('[WebSocket Auth] Token verification failed for incoming socket.');
        this.sendEnvelope(client.ws, 'AUTH_ERROR', { message: 'توکن نامعتبر یا منقضی شده است.' });
      }
      return;
    }

    // 2. Client Keep-alive Ping
    if (msgType === 'PING') {
      this.sendEnvelope(client.ws, 'PONG', {});
      return;
    }

    // 3. Forbid any client event forging
    console.warn(`[WebSocket Security] Blocked forbidden client message of type: ${msgType}`);
  }

  /**
   * Broadcast an event to ALL active connected clients (Public)
   */
  public broadcastToAll<T>(event: WebSocketEventType, payload: T): void {
    const envelope: WebSocketEnvelope<T> = {
      event,
      timestamp: new Date().toISOString(),
      payload,
    };

    const messageStr = JSON.stringify(envelope);
    let sentCount = 0;

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
        sentCount++;
      }
    }

    console.log(`[WebSocket Broadcast] Event ${event} sent to ${sentCount} clients.`);
  }

  /**
   * Broadcast an event ONLY to authenticated controllers (Admin only)
   */
  public broadcastToControllers<T>(event: WebSocketEventType, payload: T): void {
    const envelope: WebSocketEnvelope<T> = {
      event,
      timestamp: new Date().toISOString(),
      payload,
    };

    const messageStr = JSON.stringify(envelope);
    let sentCount = 0;

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN && client.user?.role === 'controller') {
        client.ws.send(messageStr);
        sentCount++;
      }
    }

    console.log(`[WebSocket Controller Broadcast] Event ${event} sent to ${sentCount} controller(s).`);
  }

  /**
   * Send an event ONLY to a specific authenticated user
   */
  public sendToUser<T>(userId: string, event: WebSocketEventType, payload: T): void {
    const envelope: WebSocketEnvelope<T> = {
      event,
      timestamp: new Date().toISOString(),
      payload,
    };

    const messageStr = JSON.stringify(envelope);
    let sentCount = 0;

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN && client.user?.id === userId) {
        client.ws.send(messageStr);
        sentCount++;
      }
    }

    console.log(`[WebSocket Targeted] Event ${event} sent to user ${userId} (${sentCount} active connections).`);
  }

  /**
   * Convenience broadcast triggers
   */
  public broadcastMatamMode(matamMode: boolean): void {
    this.broadcastToAll<MatamModeToggledPayload>('MATAM_MODE_TOGGLED', { matamMode });
  }

  public broadcastSettingsChanged(settings: SettingsChangedPayload): void {
    this.broadcastToAll<SettingsChangedPayload>('SETTINGS_CHANGED', settings);
  }

  public broadcastNewContent(content: NewContentPublishedPayload): void {
    this.broadcastToAll<NewContentPublishedPayload>('NEW_CONTENT_PUBLISHED', content);
  }

  public broadcastNewSubmission(submission: NewSubmissionAlertPayload): void {
    this.broadcastToControllers<NewSubmissionAlertPayload>('NEW_SUBMISSION_ALERT', submission);
  }

  public notifySubmissionEvaluated(userId: string, evaluation: SubmissionEvaluatedPayload): void {
    this.sendToUser<SubmissionEvaluatedPayload>(userId, 'SUBMISSION_EVALUATED', evaluation);
  }

  private sendEnvelope(ws: WebSocket, event: any, payload: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      const envelope: WebSocketEnvelope = {
        event,
        timestamp: new Date().toISOString(),
        payload,
      };
      ws.send(JSON.stringify(envelope));
    }
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const client of this.clients) {
      client.ws.terminate();
    }
    this.clients.clear();
    this.wss?.close();
  }
}

export const wsManager = new WebSocketManager();
