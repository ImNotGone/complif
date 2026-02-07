import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

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
   * Generate JWT token (login)
   */
  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);
    
    this.logger.log(`JWT token generated for user: ${user.email} (${user.role})`);
    
    return {
      access_token: token,
    };
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
        // Exclude password
      },
    });

    if (!user) {
      this.logger.warn(`User not found for getCurrentUser: ${userId}`);
      throw new NotFoundException('User not found');
    }

    this.logger.debug(`Current user retrieved: ${user.email}`);
    return user;
  }
}