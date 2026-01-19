import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Firebase ID token from email link sign-in' })
  @IsString()
  idToken: string;

  @ApiProperty({ description: 'User ID to link the email to', required: false })
  @IsString()
  @IsOptional()
  userId?: string;
}
