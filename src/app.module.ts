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

@Module({
  imports: [
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

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
      errorMessage: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.',
    }),

    ConfigModule.forRoot({ isGlobal: true, expandVariables: true }),
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
