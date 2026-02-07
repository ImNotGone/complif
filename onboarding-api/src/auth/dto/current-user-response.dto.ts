import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CurrentUserResponseDto {
  @ApiProperty({
    example: 'clwxyz123-456-789',
    description: 'User ID (UUID)',
  })
  id: string;

  @ApiProperty({
    example: 'admin@portal.com',
    description: 'User email',
  })
  email: string;

  @ApiProperty({
    enum: Role,
    example: Role.ADMIN,
    description: 'User role',
  })
  role: Role;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Account creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}