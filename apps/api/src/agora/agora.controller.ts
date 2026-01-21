import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgoraService } from './agora.service';
import { GenerateTokenDto } from './dto/generate-token.dto';

@ApiTags('Agora')
@Controller('agora')
export class AgoraController {
  constructor(private readonly agoraService: AgoraService) {}

  @Post('token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate an Agora RTC token for video calls' })
  generateToken(@Body() dto: GenerateTokenDto) {
    const token = this.agoraService.generateRtcToken(
      dto.channelName,
      dto.uid,
      dto.role || 'publisher',
      dto.expirationInSeconds || 3600,
    );

    return {
      token,
      appId: this.agoraService.getAppId(),
      channelName: dto.channelName,
      uid: dto.uid,
    };
  }

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Agora configuration (App ID)' })
  getConfig() {
    return {
      appId: this.agoraService.getAppId(),
    };
  }
}
