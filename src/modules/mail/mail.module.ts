import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { BullModule } from '@nestjs/bullmq';
import { MAIL_QUEUE } from '@/common/constants/queue.constant';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { MailProcessor } from './mail.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: MAIL_QUEUE }),
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),

    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<IConfigService>) => {
        const mailPort = Number(configService.get<string>('MAIL_PORT'));

        return {
          transport: {
            host: configService.get<string>('MAIL_HOST'),
            port: mailPort,
            secure: mailPort === 465,
            auth: {
              user: configService.get<string>('MAIL_USER'),
              pass: configService.get<string>('MAIL_PASS'),
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
          },

          defaults: {
            from: `"BookStore" <${configService.get<string>('MAIL_USER')}>`,
          },

          template: {
            dir: join(process.cwd(), 'src/modules/mail/templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: false,
            },
          },
        };
      },
    }),
  ],
  controllers: [MailController],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
