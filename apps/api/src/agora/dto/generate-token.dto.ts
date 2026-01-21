import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateTokenDto {
  @ApiProperty({ description: 'The channel name to join' })
  @IsString()
  channelName: string;

  @ApiProperty({ description: 'The user ID (numeric)' })
  @IsNumber()
  uid: number;

  @ApiPropertyOptional({
    description: 'Role: publisher (send/receive) or subscriber (receive only)',
    default: 'publisher',
  })
  @IsOptional()
  @IsIn(['publisher', 'subscriber'])
  role?: 'publisher' | 'subscriber';

  @ApiPropertyOptional({
    description: 'Token expiration time in seconds',
    default: 3600,
  })
  @IsOptional()
  @IsNumber()
  expirationInSeconds?: number;
}
