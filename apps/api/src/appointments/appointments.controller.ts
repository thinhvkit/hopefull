import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(
    private appointmentsService: AppointmentsService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  async create(
    @Request() req: any,
    @Body()
    body: {
      therapistId: string;
      scheduledAt: string;
      duration: number;
      timezone: string;
      bookingNotes?: string;
      amount: number;
    },
  ) {
    return this.appointmentsService.create({
      userId: req.user.id,
      therapistId: body.therapistId,
      scheduledAt: new Date(body.scheduledAt),
      duration: body.duration,
      timezone: body.timezone,
      bookingNotes: body.bookingNotes,
      amount: body.amount,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get user appointments' })
  @ApiQuery({ name: 'status', required: false, enum: ['upcoming', 'past'] })
  async findByUser(
    @Request() req: any,
    @Query('status') status?: 'upcoming' | 'past',
  ) {
    return this.appointmentsService.findByUser(req.user.id, status);
  }

  @Get('therapist')
  @ApiOperation({ summary: 'Get therapist appointments' })
  @ApiQuery({ name: 'status', required: false, enum: ['upcoming', 'past'] })
  async findByTherapist(
    @Request() req: any,
    @Query('status') status?: 'upcoming' | 'past',
  ) {
    return this.appointmentsService.findByTherapist(req.user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  async findById(@Param('id') id: string) {
    return this.appointmentsService.findById(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm appointment (therapist only)' })
  async confirm(@Request() req: any, @Param('id') id: string) {
    return this.appointmentsService.confirm(id, req.user.id);
  }

  @Patch(':id/decline')
  @ApiOperation({ summary: 'Decline appointment request (therapist only)' })
  async decline(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.appointmentsService.decline(id, req.user.id, body.reason);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment (patient)' })
  async cancel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.appointmentsService.cancel(id, req.user.id, body.reason, false);
  }

  @Patch(':id/therapist-cancel')
  @ApiOperation({ summary: 'Cancel appointment (therapist)' })
  async therapistCancel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.appointmentsService.cancel(id, req.user.id, body.reason, true);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete appointment (therapist only)' })
  async complete(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { sessionNotes?: string },
  ) {
    return this.appointmentsService.complete(id, req.user.id, body.sessionNotes);
  }

  @Post(':id/test-reminder')
  @ApiOperation({ summary: 'DEV ONLY: trigger a reminder in ~10 seconds' })
  @ApiQuery({ name: 'type', required: false, enum: ['24H', '1H', '15MIN'] })
  async testReminder(@Param('id') id: string, @Query('type') type = '15MIN') {
    await this.prisma.appointmentReminder.create({
      data: {
        appointmentId: id,
        reminderType: type,
        scheduledFor: new Date(Date.now() + 10_000),
      },
    });
    return { ok: true, firesIn: '~10 seconds', reminderType: type };
  }

  // ─── Admin endpoints ───────────────────────────────────────────────

  @Get('all')
  @UseGuards(RolesGuard)
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  @ApiOperation({ summary: 'List all appointments (admin only)' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.appointmentsService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      status,
      dateFrom,
      dateTo,
    });
  }

  @Patch(':id/admin-cancel')
  @UseGuards(RolesGuard)
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  @ApiOperation({ summary: 'Cancel any appointment (admin only)' })
  async adminCancel(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.appointmentsService.adminCancel(id, body.reason);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Add review for appointment' })
  async addReview(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      rating: number;
      feedback?: string;
      tags?: string[];
      isAnonymous?: boolean;
    },
  ) {
    return this.appointmentsService.addReview(id, req.user.id, body);
  }
}
