import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadAvatarDto } from './dto/upload-avatar.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @Request() req: any,
    @Body() data: {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      bio?: string;
      timezone?: string;
      preferredLanguage?: string;
    },
  ) {
    return this.usersService.updateProfile(req.user.id, data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post('profile/avatar')
  @ApiOperation({ summary: 'Upload profile avatar' })
  async uploadAvatar(
    @Request() req: any,
    @Body() dto: UploadAvatarDto,
  ) {
    return this.usersService.uploadAvatar(req.user.id, dto.base64, dto.mimeType);
  }

  @Delete('profile/avatar')
  @ApiOperation({ summary: 'Remove profile avatar' })
  async removeAvatar(@Request() req: any) {
    await this.usersService.removeAvatar(req.user.id);
    return { message: 'Avatar removed successfully' };
  }
}
