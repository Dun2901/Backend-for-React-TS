import { Controller, Get } from '@nestjs/common';
import { Public, ResponseMessage } from '@/common/decorators/customize';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ResponseMessage('BookStore API đang hoạt động')
  getHealth() {
    return this.appService.getHealth();
  }
}
