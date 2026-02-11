import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'FCM device token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Device platform', enum: ['ios', 'android', 'web'] })
  @IsEnum(['ios', 'android', 'web'])
  platform: string;
}

export class RemoveDeviceTokenDto {
  @ApiProperty({ description: 'FCM device token to remove' })
  @IsString()
  token: string;
}

export class SendChatMessageDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  recipientId: string;

  @ApiProperty({ description: 'Sender display name' })
  @IsString()
  senderName: string;

  @ApiProperty({ description: 'Appointment ID for the chat' })
  @IsString()
  appointmentId: string;
}
