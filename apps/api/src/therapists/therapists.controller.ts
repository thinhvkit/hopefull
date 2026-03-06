import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Patch,
  Delete,
  Request,
  Body,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TherapistsService } from './therapists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('Therapists')
@Controller('therapists')
export class TherapistsController {
  constructor(private therapistsService: TherapistsService) {}

  @Get()
  @ApiOperation({ summary: 'List all verified therapists' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'specialization', required: false })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'minRating', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'isOnline', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('specialization') specialization?: string,
    @Query('language') language?: string,
    @Query('minRating') minRating?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('isOnline') isOnline?: string,
  ) {
    return this.therapistsService.findAll({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      specialization,
      language,
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      isOnline: isOnline ? isOnline === 'true' : undefined,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current therapist profile' })
  async getMyProfile(@Request() req: any) {
    const therapist = await this.therapistsService.getProfileByUserId(req.user.id);
    if (!therapist) {
      throw new ForbiddenException('Therapist profile not found');
    }
    return therapist;
  }

  @Get('instant-call/available')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available therapists for instant call, sorted by match score' })
  @ApiQuery({ name: 'language', required: false, description: 'Preferred language for matching' })
  async findAvailableForInstantCall(
    @Request() req: any,
    @Query('language') language?: string,
  ) {
    // Use user's preferred language if not specified
    const preferredLanguage = language || req.user?.preferredLanguage;
    return this.therapistsService.findAvailableForInstantCall(preferredLanguage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get therapist by ID' })
  async findById(@Param('id') id: string) {
    return this.therapistsService.findById(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get available time slots for a therapist' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  async getAvailability(
    @Param('id') id: string,
    @Query('date') date: string,
  ) {
    return this.therapistsService.getAvailableSlots(id, date);
  }

  @Get(':id/availability/summary')
  @ApiOperation({ summary: 'Get monthly availability summary for a therapist' })
  @ApiQuery({ name: 'month', required: true, description: 'Month in YYYY-MM format' })
  async getAvailabilitySummary(
    @Param('id') id: string,
    @Query('month') month: string,
  ) {
    return this.therapistsService.getAvailabilitySummary(id, month);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get reviews for a therapist' })
  async getReviews(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.therapistsService.getReviews(
      id,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Patch('me/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update online/offline status (therapist only)' })
  async updateStatus(
    @Request() req: any,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    // Find the therapist profile for this user
    const therapist = await this.therapistsService.findByUserId(req.user.id);
    if (!therapist) {
      throw new ForbiddenException('Only therapists can update their status');
    }

    return this.therapistsService.updateOnlineStatus(
      therapist.id,
      updateStatusDto.isOnline,
    );
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get therapist dashboard stats' })
  async getStats(@Request() req: any) {
    return this.therapistsService.getTherapistStats(req.user.id);
  }

  @Get('me/appointments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get therapist appointments with filters' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status: upcoming, past' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by client name' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAppointments(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.therapistsService.getTherapistAppointments(req.user.id, {
      status,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('me/appointments/upcoming')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get upcoming appointments (including pending requests)' })
  @ApiQuery({ name: 'limit', required: false })
  async getUpcomingAppointments(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.therapistsService.getUpcomingAppointments(
      req.user.id,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Patch('me/appointments/:id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a pending appointment request' })
  async acceptAppointment(
    @Request() req: any,
    @Param('id') appointmentId: string,
  ) {
    return this.therapistsService.acceptAppointment(req.user.id, appointmentId);
  }

  @Patch('me/appointments/:id/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Decline a pending appointment request' })
  async declineAppointment(
    @Request() req: any,
    @Param('id') appointmentId: string,
    @Body() body: { reason?: string },
  ) {
    return this.therapistsService.declineAppointment(req.user.id, appointmentId, body.reason);
  }

  // ─── Admin endpoints ───────────────────────────────────────────────

  @Patch(':id/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update therapist verification status (admin only)' })
  async updateVerification(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    return this.therapistsService.updateVerification(id, body.status, body.reason);
  }

  // ─── Specializations (categories) ─────────────────────────────────

  @Get('specializations')
  @ApiOperation({ summary: 'List all specializations' })
  async getSpecializations() {
    return this.therapistsService.getSpecializations();
  }

  @Post('specializations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create specialization (admin only)' })
  async createSpecialization(@Body() body: { name: string; description?: string; icon?: string }) {
    return this.therapistsService.createSpecialization(body);
  }

  @Patch('specializations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update specialization (admin only)' })
  async updateSpecialization(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; icon?: string; isActive?: boolean },
  ) {
    return this.therapistsService.updateSpecialization(id, body);
  }

  @Delete('specializations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SetMetadata(ROLES_KEY, [UserRole.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete specialization (admin only)' })
  async deleteSpecialization(@Param('id') id: string) {
    return this.therapistsService.deleteSpecialization(id);
  }
}
