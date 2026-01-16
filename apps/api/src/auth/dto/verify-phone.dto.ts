import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPhoneDto {
  @ApiProperty({ description: 'Firebase ID token after phone verification' })
  @IsString()
  idToken: string;

  @ApiProperty({ description: 'User ID if linking to existing account', required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}
