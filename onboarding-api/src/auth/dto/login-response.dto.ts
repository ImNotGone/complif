import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (expires in 15 minutes)',
  })
  access_token: string;

  @ApiProperty({
    example: 'a1b2c3d4e5f6g7h8i9j0...',
    description: 'Refresh token (expires in 7 days)',
  })
  refresh_token: string;

  @ApiProperty({
    example: 900,
    description: 'Token expiration time in seconds (15 minutes)',
  })
  expires_in: number;
}