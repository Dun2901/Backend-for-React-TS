import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrdersModule } from '../orders/orders.module';
import { VnpayModule } from 'nestjs-vnpay';
import { HashAlgorithm, ignoreLogger } from 'vnpay';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    OrdersModule,

    VnpayModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        tmnCode: configService.getOrThrow<string>('VNPAY_TMN_CODE'),
        secureSecret: configService.getOrThrow<string>('VNPAY_SECURE_SECRET'),
        vnpayHost: configService.getOrThrow<string>('VNPAY_URL'),
        testMode: configService.get<string>('VNPAY_TEST_MODE') === 'true',
        hashAlgorithm: HashAlgorithm.SHA512,
        loggerFn: ignoreLogger,
      }),
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
