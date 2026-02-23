import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@complif.com',
  password: 'hashed_password',
  role: 'ADMIN',
  refreshTokenVersion: 3,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn(),
};

function buildService(prisma = mockPrismaService, jwt = mockJwtService) {
  return Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService, useValue: prisma },
      { provide: JwtService, useValue: jwt },
    ],
  })
    .compile()
    .then((m: TestingModule) => m.get<AuthService>(AuthService));
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    service = await buildService();
  });

  describe('validateUser', () => {
    it('returns user without password when credentials are valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('admin@complif.com', 'password');

      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('returns null when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nobody@complif.com', 'password');

      expect(result).toBeNull();
    });

    it('returns null when password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);


      const result = await service.validateUser('admin@complif.com', 'wrong');

      expect(result).toBeNull();
    });

    it('queries prisma with the correct email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await service.validateUser('test@complif.com', 'pass');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@complif.com' },
      });
    });
  });

  describe('login', () => {
    beforeEach(() => {
      // Return different tokens per call so we can distinguish access vs refresh
      mockJwtService.sign
        .mockReturnValueOnce('access-token-value')
        .mockReturnValueOnce('refresh-token-value');
    });

    it('returns access_token, refresh_token, and expires_in', async () => {
      const result = await service.login(mockUser);

      expect(result).toEqual({
        access_token: 'access-token-value',
        refresh_token: 'refresh-token-value',
        expires_in: 900,
      });
    });

    it('signs access token with JWT_SECRET and 15m expiry', async () => {
      await service.login(mockUser);

      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: process.env.JWT_SECRET, expiresIn: '15m' },
      );
    });

    it('signs refresh token with JWT_REFRESH_SECRET, 7d expiry, and version', async () => {
      await service.login(mockUser);

      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          version: mockUser.refreshTokenVersion,
        },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
      );
    });

    it('embeds the current refreshTokenVersion in the refresh token', async () => {
      const userWithVersion5 = { ...mockUser, refreshTokenVersion: 5 };
      await service.login(userWithVersion5);

      const refreshSignCall = mockJwtService.sign.mock.calls[1];
      expect(refreshSignCall[0].version).toBe(5);
    });
  });

  describe('refresh', () => {
    it('returns a new access_token when token version matches DB', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser); // version = 3
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refresh(mockUser.id, mockUser.email, mockUser.role, 3);

      expect(result).toEqual({ access_token: 'new-access-token', expires_in: 900 });
    });

    it('throws UnauthorizedException when token version is stale (after logout)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, refreshTokenVersion: 4 });

      await expect(
        service.refresh(mockUser.id, mockUser.email, mockUser.role, 3), // token has v3, DB has v4
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws NotFoundException when user no longer exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.refresh('ghost-id', 'ghost@complif.com', 'VIEWER', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('signs the new access token with correct payload and secret', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('signed-token');

      await service.refresh(mockUser.id, mockUser.email, mockUser.role, 3);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, email: mockUser.email, role: mockUser.role },
        { secret: process.env.JWT_SECRET, expiresIn: '15m' },
      );
    });
  });

  describe('logout', () => {
    it('increments refreshTokenVersion in the DB', async () => {
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, refreshTokenVersion: 4 });

      await service.logout(mockUser.id);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshTokenVersion: { increment: 1 } },
      });
    });

    it('calls update exactly once per logout', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      await service.logout(mockUser.id);
      expect(mockPrismaService.user.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCurrentUser', () => {
    const selectedUser = {
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      createdAt: mockUser.createdAt,
      updatedAt: mockUser.updatedAt,
    };

    it('returns user data without password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(selectedUser);

      const result = await service.getCurrentUser(mockUser.id);

      expect(result).toEqual(selectedUser);
      expect(result).not.toHaveProperty('password');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser('ghost-id')).rejects.toThrow(NotFoundException);
    });

    it('queries with the correct select fields (no password)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(selectedUser);
      await service.getCurrentUser(mockUser.id);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });
});