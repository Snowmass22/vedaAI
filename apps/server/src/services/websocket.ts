import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { MessageModel } from '../models/Message';
import { GroupModel } from '../models/Group';

const JWT_SECRET = process.env.JWT_SECRET || 'veda-ai-super-secret-key';
const rooms = new Map<string, Set<WebSocket>>();

export const initWebSocketServer = (httpServer: Server) => {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url?.split('?')[0];
    if (pathname !== '/ws') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket & { isAlive?: boolean, userId?: string }) => {
    ws.isAlive = true;
    const subscribedRooms = new Set<string>();

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (rawData: string) => {
      try {
        const message = JSON.parse(rawData);

        // JWT Auth
        if (message.type === 'auth') {
          try {
            const decoded = jwt.verify(message.token, JWT_SECRET) as { id: string };
            ws.userId = decoded.id;
            ws.send(JSON.stringify({ type: 'auth_success' }));
          } catch (e) {
            ws.send(JSON.stringify({ type: 'auth_failed' }));
            ws.close();
          }
          return;
        }

        // Subscribing to rooms (assignments or chat groups)
        if (message.type === 'subscribe') {
          const roomId = message.assignmentId || message.groupId;
          if (!rooms.has(roomId)) rooms.set(roomId, new Set());
          rooms.get(roomId)!.add(ws);
          subscribedRooms.add(roomId);
        }

        // Sending a chat message
        if (message.type === 'chat_message' && ws.userId) {
          const { groupId, text } = message;
          
          // Verify user belongs to group
          const group = await GroupModel.findById(groupId);
          if (group && group.members.includes(ws.userId as any)) {
            // Save to DB
            const newMsg = new MessageModel({
              text,
              senderId: ws.userId,
              groupId
            });
            await newMsg.save();
            await newMsg.populate('senderId', 'name email');

            // Broadcast to room
            const payload = JSON.stringify({
              type: 'chat_message',
              message: newMsg
            });
            const roomSockets = rooms.get(groupId);
            if (roomSockets) {
              roomSockets.forEach((s) => {
                if (s.readyState === WebSocket.OPEN) {
                  s.send(payload);
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('WebSocket msg error:', error);
      }
    });

    ws.on('close', () => {
      for (const roomId of subscribedRooms) {
        const roomSockets = rooms.get(roomId);
        if (roomSockets) {
          roomSockets.delete(ws);
          if (roomSockets.size === 0) rooms.delete(roomId);
        }
      }
    });
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeatInterval));

  return wss;
};

export const broadcastToRoom = (roomId: string, event: any) => {
  const roomSockets = rooms.get(roomId);
  if (!roomSockets || roomSockets.size === 0) return;
  const payload = JSON.stringify(event);
  roomSockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
};
