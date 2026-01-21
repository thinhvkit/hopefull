import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Patch,
  Request,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TherapistsService } from './therapists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
}
