import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Real-time bildirishnomalar (Socket.IO).
 * Client `auth.token` (JWT access token) bilan ulanadi va o'z xonasiga qo'shiladi;
 * NotificationsService yangi bildirishnomani shu xonaga push qiladi.
 */
@WebSocketGateway({
  cors: { origin: (process.env.WEB_URL || 'http://localhost:3000').split(',') },
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);
      if (!token) throw new Error('token yo‘q');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  /** Foydalanuvchiga real-time bildirishnoma yuborish */
  emitToUser(userId: string, payload: { title: string; message: string; type: string; meta?: unknown }) {
    try {
      this.server?.to(`user:${userId}`).emit('notification', payload);
    } catch (e) {
      this.logger.warn(`WS emit xatosi: ${(e as Error).message}`);
    }
  }
}
