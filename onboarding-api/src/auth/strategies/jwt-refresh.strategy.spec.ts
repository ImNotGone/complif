import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { PrismaService } from '../../prisma.service';
import { UnauthorizedException } from '@nestjs/common';

const mockUser = {
    id: 'user-uuid-1',
    email: 'admin@complif.com',
    role: 'ADMIN',
    refreshTokenVersion: 3,
};

const validPayload = {
    sub: mockUser.id,
    email: mockUser.email,
    role: mockUser.role,
    version: 3,
};

const mockPrisma = {
    user: {
        findUnique: jest.fn(),
    },
};

describe('JwtRefreshStrategy', () => {
    let strategy: JwtRefreshStrategy;

    beforeAll(() => {
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Instantiate directly — no NestJS DI needed for strategy unit tests
        strategy = new JwtRefreshStrategy(mockPrisma as unknown as PrismaService);
    });

    describe('validate', () => {
        it('returns user info when token version matches DB version', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await strategy.validate(validPayload);

            expect(result).toEqual({
                userId: mockUser.id,
                email: mockUser.email,
                tokenVersion: validPayload.version,
            });
        });

        it('throws UnauthorizedException when user does not exist in DB', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
        });

        it('throws UnauthorizedException when token version is stale (logout has occurred)', async () => {
            // DB version has been incremented by a logout
            mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshTokenVersion: 4 });

            const stalePayload = { ...validPayload, version: 3 }; // token still carries old version

            await expect(strategy.validate(stalePayload)).rejects.toThrow(UnauthorizedException);
        });

        it('throws UnauthorizedException with "Refresh token has been revoked" after logout', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshTokenVersion: 4 });

            await expect(strategy.validate(validPayload)).rejects.toThrow(
                'Refresh token has been revoked',
            );
        });

        it('accepts a token after re-login (new version matches new DB version)', async () => {
            // After logout version becomes 4, user logs in again — new token carries version 4
            mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, refreshTokenVersion: 4 });
            const newPayload = { ...validPayload, version: 4 };

            const result = await strategy.validate(newPayload);

            expect(result.tokenVersion).toBe(4);
        });

        it('looks up the user by the sub field from the JWT payload', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);

            await strategy.validate(validPayload);

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: validPayload.sub },
            });
        });

        it('attaches tokenVersion to the returned object so downstream can use it', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(mockUser);

            const result = await strategy.validate(validPayload);

            expect(result).toHaveProperty('tokenVersion', validPayload.version);
        });
    });
});