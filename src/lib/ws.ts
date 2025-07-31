import WebSocket from "ws";
import { Server } from "http";
import logger from "./logger";

type WsMessage = {
  type: "subscribe" | "unsubscribe";
  address: string;
};

class WebSocketManager {
  private wss: WebSocket.Server;
  private subscriptions = new Map<string, Set<WebSocket>>();

  constructor(server: Server) {
    this.wss = new WebSocket.Server({ server });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on("connection", (ws: WebSocket) => {
      logger.info("New WebSocket connection");

      ws.on("message", (message: Buffer | string) => {
        try {
          const data = JSON.parse(message.toString()) as WsMessage;
          logger.info("Received WebSocket message:", data);
          if (data.type === "subscribe") {
            this.subscribe(data.address, ws);
          } else if (data.type === "unsubscribe") {
            this.unsubscribe(data.address, ws);
          }
        } catch (err) {
          const error = err as Error;
          logger.error("Error processing WebSocket message:", error);
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      });

      ws.on("close", () => this.removeSubscriber(ws));
      ws.on("error", (err: Error) => {
        logger.error("WebSocket error:", err);
        this.removeSubscriber(ws);
      });
    });
  }

  private subscribe(address: string, ws: WebSocket) {
    if (!this.subscriptions.has(address)) {
      this.subscriptions.set(address, new Set());
    }
    this.subscriptions.get(address)?.add(ws);
    ws.send(JSON.stringify({ type: "subscribed", address }));
  }

  private unsubscribe(address: string, ws: WebSocket) {
    this.subscriptions.get(address)?.delete(ws);
    if (this.subscriptions.get(address)?.size === 0) {
      this.subscriptions.delete(address);
    }
    ws.send(JSON.stringify({ type: "unsubscribed", address }));
  }

  private removeSubscriber(ws: WebSocket) {
    for (const [address, subscribers] of this.subscriptions.entries()) {
      if (subscribers.has(ws)) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.subscriptions.delete(address);
        }
      }
    }
  }

  public broadcast(address: string, data: unknown) {
    const subscribers = this.subscriptions.get(address);
    if (subscribers) {
      const message = JSON.stringify(data);
      subscribers.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }

  public getSubscriberCount(address: string): number {
    return this.subscriptions.get(address)?.size || 0;
  }
}

let wsManager: WebSocketManager | null = null;

export function initWebSocket(server: Server): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}
