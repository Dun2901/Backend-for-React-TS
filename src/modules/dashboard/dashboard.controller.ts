import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ResponseMessage, Roles } from '@/common/decorators/customize';
import { UserRoles } from '@/common/enums';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('dashboard')
@Roles(UserRoles.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ResponseMessage('Lấy thống kê dashboard thành công')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('latest-orders')
  @ResponseMessage('Lấy đơn hàng mới nhất thành công')
  getLatestOrders(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : 5;
    return this.dashboardService.getLatestOrders(parsedLimit);
  }

  @Get('top-selling-books')
  @ResponseMessage('Lấy sách bán chạy thành công')
  getTopSellingBooks(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : 5;
    return this.dashboardService.getTopSellingBooks(parsedLimit);
  }

  @Get('revenue-chart')
  @ResponseMessage('Lấy biểu đồ doanh thu thành công')
  getRevenueChart(@Query('type') type?: 'day' | 'month') {
    return this.dashboardService.getRevenueChart(type || 'month');
  }
}
