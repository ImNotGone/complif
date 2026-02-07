import { Controller, Post, Get, Body, UnauthorizedException, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Public } from './public.decorator';
import { AuthenticatedOnly } from './auth.decorator';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password, returns JWT token' })
  @ApiResponse({
    status: 201,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }

  @AuthenticatedOnly()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiOkResponse({
    description: 'Current user information',
    type: CurrentUserResponseDto,
  })
  async getCurrentUser(@Req() req: any): Promise<CurrentUserResponseDto> {
    return this.authService.getCurrentUser(req.user.userId);
  }
}