/**
 * Custom Next.js server.
 * Runs the Next.js app AND a WebSocket server on the same port.
 * The WebSocket server intercepts upgrade requests to /api/voice/relay
 * for Twilio ConversationRelay.
 *
 * Usage:
 *   npm run dev     → starts this file via ts-node (see package.json)
 *   npm run start   → same for production
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { handleRelayConnection } from "./lib/voice/relay";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const proto = req.headers["x-forwarded-proto"] ?? "ws";
    const host = req.headers.host ?? `localhost:${port}`;
    const url = new URL(req.url ?? "/", `${proto}://${host}`);
    handleRelayConnection(ws, url);
  });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url ?? "/");
    if (pathname === "/api/voice/relay") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket relay: ws://${hostname}:${port}/api/voice/relay`);
  });
});
