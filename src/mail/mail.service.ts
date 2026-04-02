import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

interface ISendMailPayload {
  email: string;
  fullName: string;
  codeId: string;
}

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(user: ISendMailPayload) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Xác thực tài khoản của bạn',
      template: 'verify-email', // templates/verify-email.hbs
      context: {
        name: user.fullName,
        code: user.codeId,
        expiredIn: '5 phút',
      },
    });
  }
}
