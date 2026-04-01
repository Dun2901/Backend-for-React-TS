import { Controller, Get } from '@nestjs/common';
import { MailService } from './mail.service';
import { Public } from '@/decorator/customize';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private mailerService: MailerService,
  ) {}

  @Get()
  @Public()
  async handleTestEmail() {
    await this.mailerService.sendMail({
      to: 'dun29012003@gmail.com',
      from: '"Support Team" <support@example.com>', // override default from
      subject: 'Welcome to Nice App! Confirm your Email',
      html: '<b>welcome bla bla dung</b>', // HTML body content
    });
  }
}
