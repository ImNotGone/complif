import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from './public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Obtener JWT Token' })
  @ApiResponse({
    status: 201,
    description: 'Login exitoso',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales inválidas',
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.authService.login(user);
  }
}
