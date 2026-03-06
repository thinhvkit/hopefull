import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@SetMetadata(ROLES_KEY, [UserRole.ADMIN])
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard stats' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get all system settings' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Post('settings')
  @ApiOperation({ summary: 'Upsert system settings' })
  async updateSettings(@Body() body: Record<string, string>) {
    return this.adminService.updateSettings(body);
  }

  @Get('support')
  @ApiOperation({ summary: 'List support tickets' })
  async getSupportTickets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getSupportTickets({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
    });
  }

  @Patch('support/:id')
  @ApiOperation({ summary: 'Update support ticket' })
  async updateSupportTicket(
    @Param('id') id: string,
    @Body() body: { status?: string; assignedTo?: string },
  ) {
    return this.adminService.updateSupportTicket(id, body);
  }
}
