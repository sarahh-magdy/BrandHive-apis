import {
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminFiltersDto, AnalyticsDto } from './dto/admin-filters.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Auth(['Admin'])
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // ─── Dashboard ────────────────────────────────────────────────
    // GET /admin/dashboard
    @Get('dashboard')
    getDashboard() {
        return this.adminService.getDashboard();
    }

    // ─── Analytics ────────────────────────────────────────────────
    // GET /admin/analytics/revenue?period=month
    @Get('analytics/revenue')
    getRevenueAnalytics(@Query() query: AnalyticsDto) {
        return this.adminService.getRevenueAnalytics(query);
    }

    // GET /admin/analytics/orders?period=month
    @Get('analytics/orders')
    getOrdersAnalytics(@Query() query: AnalyticsDto) {
        return this.adminService.getOrdersAnalytics(query);
    }

    // GET /admin/analytics/top-products?limit=10
    @Get('analytics/top-products')
    getTopProducts(@Query() query: AnalyticsDto) {
        return this.adminService.getTopProducts(query);
    }

    // GET /admin/analytics/top-customers?limit=10
    @Get('analytics/top-customers')
    getTopCustomers(@Query() query: AnalyticsDto) {
        return this.adminService.getTopCustomers(query);
    }

    // ─── Users Management ─────────────────────────────────────────
    // GET /admin/users?page=1&limit=10&search=ahmed&role=Customer
    @Get('users')
    getUsers(@Query() query: AdminFiltersDto) {
        return this.adminService.getUsers(query);
    }

    // PATCH /admin/users/:id/toggle
    @Patch('users/:id/toggle')
    toggleUserStatus(@Param('id') id: string) {
        return this.adminService.toggleUserStatus(id);
    }

    // DELETE /admin/users/:id
    @Delete('users/:id')
    deleteUser(@Param('id') id: string) {
        return this.adminService.deleteUser(id);
    }
}