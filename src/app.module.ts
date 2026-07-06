import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import MongooseDelete from 'mongoose-delete';
import { MailModule } from './modules/mail/mail.module';
import { DatabasesModule } from './databases/databases.module';
import { BooksModule } from './modules/books/books.module';
import { FilesModule } from './modules/files/files.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartsModule } from './modules/carts/carts.module';
import { OrdersModule } from './modules/orders/orders.module';
import { HistoryModule } from './modules/history/history.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { Connection } from 'mongoose';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { LocationsModule } from './modules/locations/locations.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { BullModule } from '@nestjs/bullmq';
import { parseRedisConnection } from './common/utils/redis-connection.util';
import { WishlistsModule } from './modules/wishlists/wishlists.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, expandVariables: true }),

    UsersModule,
    AuthModule,
    MailModule,
    DatabasesModule,
    BooksModule,
    FilesModule,
    CategoriesModule,
    CartsModule,
    OrdersModule,
    HistoryModule,
    PaymentsModule,
    DashboardModule,
    ReviewsModule,
    LocationsModule,
    AddressesModule,
    NotificationsModule,
    ChatbotModule,
    WishlistsModule,

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
      errorMessage: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.',
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // const host = configService.get<string>('REDIS_HOST') || 'localhost';
        // const port = configService.get<number>('REDIS_PORT') || 6379;
        const ttl = configService.get<number>('REDIS_CACHE_TTL') || 300000;

        // const redisUrl = `redis://${host}:${port}`; => cái này dùng để chạy local
        const redisUrl = configService.get<string>('REDIS_URL');

        return {
          stores: [new KeyvRedis(redisUrl)],
          ttl,
        };
      },
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisQueueUrl =
          configService.get<string>('REDIS_QUEUE_URL') || 'redis://127.0.0.1:6379';

        return {
          connection: parseRedisConnection(redisQueueUrl),
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 3000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        };
      },
      inject: [ConfigService],
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URL'),
        // Thêm global plugin
        connectionFactory: (connection: Connection) => {
          connection.plugin(MongooseDelete, {
            deletedAt: true,
            deletedBy: true,
            overrideMethods: true,
          });
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
  ],

  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
