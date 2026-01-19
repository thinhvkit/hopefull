import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SocialProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

export class SocialAuthDto {
  @ApiProperty({
    enum: SocialProvider,
    example: 'google',
    description: 'Social provider (google or apple)',
  })
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIs...',
    description: 'Firebase ID token from social sign-in',
  })
  @IsString()
  idToken: string;

  @ApiProperty({
    example: 'John',
    description: 'First name (optional, provided by Apple on first sign-in)',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name (optional, provided by Apple on first sign-in)',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}
