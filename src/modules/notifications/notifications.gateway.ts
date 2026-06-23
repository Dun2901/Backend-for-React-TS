import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UserRoles } from '@/common/enums';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';

type NotificationSocketPayload = {
  notification: unknown;
  unreadCount: number;
};

type AdminNewOrderSocketPayload = {
  order: unknown;
};

type AdminOrderUpdatedSocketPayload = {
  order: unknown;
};

type NotificationSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  { userId: string }
>;

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<IConfigService>,
  ) {}

  async handleConnection(client: NotificationSocket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<IJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload._id;
      await client.join(this.getUserRoom(payload._id));

      // Admin sẽ được join thêm room riêng để nhận đơn hàng mới
      if (payload.role === UserRoles.ADMIN) {
        await client.join(this.getAdminOrdersRoom());
      }

      this.logger.log(`Notification socket connected: user=${payload._id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: NotificationSocket) {
    const userId = client.data?.userId;

    if (userId) {
      this.logger.log(`Notification socket disconnected: user=${userId}`);
    }
  }

  emitNewNotification(
    userId: string | mongoose.Types.ObjectId,
    payload: NotificationSocketPayload,
  ) {
    this.server.to(this.getUserRoom(userId)).emit('notification:new', payload);
  }

  emitUnreadCount(userId: string | mongoose.Types.ObjectId, unreadCount: number) {
    this.server.to(this.getUserRoom(userId)).emit('notification:unread-count', {
      unreadCount,
    });
  }

  emitNewOrderToAdmins(payload: AdminNewOrderSocketPayload) {
    this.server.to(this.getAdminOrdersRoom()).emit('admin:order:new', payload);
  }

  emitOrderUpdatedToAdmins(payload: AdminOrderUpdatedSocketPayload) {
    this.server.to(this.getAdminOrdersRoom()).emit('admin:order:updated', payload);
  }

  private getUserRoom(userId: string | mongoose.Types.ObjectId) {
    return `user:${userId.toString()}`;
  }

  private getAdminOrdersRoom() {
    return 'admin:orders';
  }

  private extractToken(client: NotificationSocket) {
    const { token: authToken } = client.handshake.auth as { token?: string };

    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const authorization = client.handshake.headers.authorization;

    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      return authorization.slice(7).trim();
    }

    return null;
  }
}
