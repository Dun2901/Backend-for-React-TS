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
  ],
})
export class AppModule {}
