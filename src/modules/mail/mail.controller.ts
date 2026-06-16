import { Controller, Get } from '@nestjs/common';
import { MailService } from './mail.service';
import { Public } from '@/common/decorators/customize';
import { MailerService } from '@nestjs-modules/mailer';
import { Throttle } from '@nestjs/throttler';

@Controller('mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private mailerService: MailerService,
  ) {}

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Get()
  @Public()
  async handleTestEmail() {
    await this.mailerService.sendMail({
      to: 'dun29012003@gmail.com',
      from: '"Support Team" <support@example.com>', // override default from
      subject: 'Welcome to Nice App! Confirm your Email',
      template: 'register.hbs',
      context: {
        name: 'Dung',
        activationCode: 1234,
      },
    });
    return 'ok';
  }
}
