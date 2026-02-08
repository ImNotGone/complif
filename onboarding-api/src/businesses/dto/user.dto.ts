import { ApiProperty } from "@nestjs/swagger";

export class UserDto {
  @ApiProperty({ example: 'admin@complif.com' })
  email: string;

  @ApiProperty({ example: 'ADMIN' })
  role: string;
}