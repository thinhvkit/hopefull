import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadAvatarDto {
  @ApiProperty({
    description: 'Base64 encoded image data (without data:image/... prefix)',
    example: '/9j/4AAQSkZJRg...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15 * 1024 * 1024) // ~10MB in base64 (base64 is ~33% larger)
  base64: string;

  @ApiProperty({
    description: 'MIME type of the image',
    example: 'image/jpeg',
    enum: ['image/jpeg', 'image/png', 'image/heic'],
  })
  @IsString()
  @Matches(/^image\/(jpeg|png|heic)$/, {
    message: 'mimeType must be image/jpeg, image/png, or image/heic',
  })
  mimeType: string;
}
