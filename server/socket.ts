import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { FullTelemetrySnapshot, AlertItem } from './types.js';
import { acknowledgeAlert, clearAlerts, executeRawQuery } from './db.js';
import { updateConfig, getConfig } from './config.js';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Send connection welcome acknowledgment
    socket.emit('connection:ack', {
      connected: true,
      socketId: socket.id,
      timestamp: Date.now(),
      config: getConfig(),
    });

    socket.on('client:ack-alert', (alertId: string) => {
      acknowledgeAlert(alertId);
      io?.emit('alerts:updated', { acknowledgedId: alertId });
    });

    socket.on('client:clear-alerts', () => {
      clearAlerts();
      io?.emit('alerts:cleared', { timestamp: Date.now() });
    });

    socket.on('client:save-config', (newConfig: any) => {
      try {
        const updated = updateConfig(newConfig);
        io?.emit('config:updated', updated);
      } catch (err: any) {
        socket.emit('config:error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
}

export function broadcastTelemetry(snapshot: FullTelemetrySnapshot): void {
  if (io) {
    io.emit('telemetry:update', snapshot);
  }
}

export function broadcastAlert(alert: AlertItem): void {
  if (io) {
    io.emit('alerts:new', alert);
  }
}

export function getIO(): SocketIOServer | null {
  return io;
}
