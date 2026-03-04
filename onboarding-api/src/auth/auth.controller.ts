import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { RateLimit } from './decorators/rate-limit.decorator';
import { AuthenticatedOnly } from './decorators/auth.decorator';
import { RefreshTokenOnly } from './decorators/refresh.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ---------------------------------------------------------------------------
  // POST /auth/login  — public
  // ---------------------------------------------------------------------------
  @Public()
  @RateLimit()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password, returns access and refresh tokens' })
  @ApiResponse({ status: 201, description: 'Login successful', type: LoginResponseDto })
  @ApiResponse({ status: 429, description: 'Too many login attempts — rate limit exceeded' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authService.login(user);
  }

  // ---------------------------------------------------------------------------
  // POST /auth/refresh  — requires valid refresh token (version-checked)
  // ---------------------------------------------------------------------------
  @RefreshTokenOnly()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a new access token using a valid refresh token' })
  @ApiOkResponse({ description: 'New access token issued' })
  async refresh(@Req() req: any) {
    const { userId, email, role, tokenVersion } = req.user;
    return this.authService.refresh(userId, email, role, tokenVersion);
  }

  // ---------------------------------------------------------------------------
  // POST /auth/logout  — requires valid refresh token; increments version
  // ---------------------------------------------------------------------------
  @RefreshTokenOnly()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — invalidates all existing refresh tokens for the user' })
  @ApiOkResponse({ description: 'Logged out successfully' })
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.userId);
    return { message: 'Logged out successfully' };
  }

  // ---------------------------------------------------------------------------
  // GET /auth/me  — requires valid access token
  // ---------------------------------------------------------------------------
  @AuthenticatedOnly()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiOkResponse({ description: 'Current user information', type: CurrentUserResponseDto })
  async getCurrentUser(@Req() req: any): Promise<CurrentUserResponseDto> {
    return this.authService.getCurrentUser(req.user.userId);
  }
}