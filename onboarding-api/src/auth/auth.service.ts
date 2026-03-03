import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { createLogger } from '../logging/logger';

@Injectable()
export class AuthService {
  private readonly logger = createLogger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, pass: string): Promise<any> {
    this.logger.debug(`Attempting to validate user: ${email}`);

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      this.logger.warn(`User not found: ${email}`);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Invalid password attempt for user: ${email}`);
      return null;
    }

    this.logger.log(`User validated successfully: ${email}`);
    const { password, ...result } = user;
    return result;
  }

  /**
   * Generate access + refresh tokens on login
   */
  async login(user: any) {
    const { accessToken, refreshToken } = await this._generateTokens(
      user.id,
      user.email,
      user.role,
      user.refreshTokenVersion,
    );

    this.logger.log(`Tokens generated for user: ${user.email} (${user.role})`);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes in seconds
    };
  }

  /**
   * Refresh: issue a new access token using a valid refresh token.
   * The refresh strategy has already validated the token version against the DB.
   */
  async refresh(userId: string, email: string, role: string, tokenVersion: number) {
    // Re-fetch the current version to be sure (strategy already does this, but belt-and-suspenders)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    if (user.refreshTokenVersion !== tokenVersion) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const accessToken = this._signAccessToken(userId, email, role);

    this.logger.log(`Access token refreshed for user: ${email}`);

    return {
      access_token: accessToken,
      expires_in: 900,
    };
  }

  /**
   * Logout: increment the refresh token version, invalidating all existing refresh tokens.
   */
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenVersion: { increment: 1 } },
    });

    this.logger.log(`User logged out, refresh token version incremented: ${userId}`);
  }

  /**
   * Get current user by ID (from JWT payload)
   */
  async getCurrentUser(userId: string) {
    this.logger.debug(`Fetching current user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      this.logger.warn(`User not found for getCurrentUser: ${userId}`);
      throw new NotFoundException('User not found');
    }

    this.logger.debug(`Current user retrieved: ${user.email}`);
    return user;
  }

  private _signAccessToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });
  }

  private _signRefreshToken(userId: string, email: string, role: string, version: number): string {
    const payload = { sub: userId, email, role, version };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
  }

  private async _generateTokens(
    userId: string,
    email: string,
    role: string,
    version: number,
  ) {
    return {
      accessToken: this._signAccessToken(userId, email, role),
      refreshToken: this._signRefreshToken(userId, email, role, version),
    };
  }
}