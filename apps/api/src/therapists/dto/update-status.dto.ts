import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'Whether the therapist is online and available for sessions',
    example: true,
  })
  @IsBoolean()
  isOnline: boolean;
}
