import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';

const mockLoginResponse = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 900,
};

const mockCurrentUser = {
  id: 'user-uuid-1',
  email: 'admin@complif.com',
  role: 'ADMIN',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockRefreshResponse = {
  access_token: 'new-access-token',
  expires_in: 900,
};

const mockAuthService = {
  validateUser: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
};

function makeReq(user: object) {
  return { user };
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    const loginDto = { email: 'admin@complif.com', password: 'complif_admin' };

    it('returns tokens when credentials are valid', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockCurrentUser);
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockLoginResponse);
    });

    it('calls validateUser with the provided email and password', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockCurrentUser);
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(loginDto);

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
    });

    it('calls login with the validated user object', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockCurrentUser);
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(mockCurrentUser);
    });

    it('throws UnauthorizedException when validateUser returns null', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException with "Invalid credentials" message', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    const req = makeReq({
      userId: 'user-uuid-1',
      email: 'admin@complif.com',
      role: 'ADMIN',
      tokenVersion: 3,
    });

    it('returns a new access token', async () => {
      mockAuthService.refresh.mockResolvedValue(mockRefreshResponse);

      const result = await controller.refresh(req);

      expect(result).toEqual(mockRefreshResponse);
    });

    it('calls authService.refresh with userId, email, role, and tokenVersion from req.user', async () => {
      mockAuthService.refresh.mockResolvedValue(mockRefreshResponse);

      await controller.refresh(req);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        'user-uuid-1',
        'admin@complif.com',
        'ADMIN',
        3,
      );
    });

    it('propagates errors thrown by authService.refresh (e.g. revoked token)', async () => {
      mockAuthService.refresh.mockRejectedValue(
        new UnauthorizedException('Refresh token has been revoked'),
      );

      await expect(controller.refresh(req)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    const req = makeReq({ userId: 'user-uuid-1' });

    it('returns a success message', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(req);

      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('calls authService.logout with the userId from req.user', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(req);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-uuid-1');
    });

    it('calls logout exactly once', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      await controller.logout(req);
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCurrentUser', () => {
    const req = makeReq({ userId: 'user-uuid-1' });

    it('returns the current user', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockCurrentUser);

      const result = await controller.getCurrentUser(req);

      expect(result).toEqual(mockCurrentUser);
    });

    it('calls getCurrentUser with userId from req.user', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue(mockCurrentUser);

      await controller.getCurrentUser(req);

      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith('user-uuid-1');
    });

    it('propagates NotFoundException when user does not exist', async () => {
      mockAuthService.getCurrentUser.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.getCurrentUser(req)).rejects.toThrow('User not found');
    });
  });
});