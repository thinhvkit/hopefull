import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import {
  PaginationQueryDto,
  RegisterDeviceTokenDto,
  RemoveDeviceTokenDto,
  SendChatMessageDto,
} from './dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of notifications' })
  @ApiResponse({ status: 200, description: 'Returns paginated notifications' })
  async findAll(@Request() req: any, @Query() query: PaginationQueryDto) {
    return this.notificationsService.findAll(req.user.id, query.page, query.limit);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({ status: 200, description: 'Returns unread count' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    await this.notificationsService.markAsRead(id, req.user.id);
    return { success: true };
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async delete(@Request() req: any, @Param('id') id: string) {
    await this.notificationsService.delete(id, req.user.id);
    return { success: true };
  }

  @Post('device-token')
  @ApiOperation({ summary: 'Register FCM device token for push notifications' })
  @ApiResponse({ status: 201, description: 'Device token registered' })
  async registerDeviceToken(
    @Request() req: any,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    console.log('[Notifications] Registering device token for user:', req.user.id, 'platform:', dto.platform);
    await this.notificationsService.registerDeviceToken(
      req.user.id,
      dto.token,
      dto.platform,
    );
    console.log('[Notifications] Device token registered successfully');
    return { success: true };
  }

  @Delete('device-token')
  @ApiOperation({ summary: 'Remove FCM device token' })
  @ApiResponse({ status: 200, description: 'Device token removed' })
  async removeDeviceToken(@Body() dto: RemoveDeviceTokenDto) {
    await this.notificationsService.removeDeviceToken(dto.token);
    return { success: true };
  }

  @Post('chat-message')
  @ApiOperation({ summary: 'Send push notification for a new chat message' })
  @ApiResponse({ status: 201, description: 'Chat message notification sent' })
  async sendChatMessage(@Request() req: any, @Body() dto: SendChatMessageDto) {
    await this.notificationsService.sendChatMessage(
      dto.recipientId,
      dto.senderName,
      dto.appointmentId,
    );
    return { success: true };
  }

  @Post('test/booking-confirmation')
  @ApiOperation({ summary: 'Send a test booking confirmation notification' })
  @ApiResponse({ status: 201, description: 'Test notification sent' })
  async testBookingConfirmation(@Request() req: any) {
    console.log('[Notifications] Sending test booking confirmation to user:', req.user.id);
    await this.notificationsService.sendBookingConfirmation(
      req.user.id,
      'test-appointment-id',
      'Dr. Sarah Wilson',
      'January 24, 2026 at 10:00 AM',
    );
    return { success: true, message: 'Booking confirmation notification sent' };
  }
}
