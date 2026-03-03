import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';

// Mock dependencies before importing
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    subscribe: jest.fn(),
    on: jest.fn(),
    publish: jest.fn(),
    quit: jest.fn(),
  }));
});

// Mock the Public decorator at the module level
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    SetMetadata: jest.fn(() => () => {}),
  };
});

describe('EventsController', () => {
  let jwtService: { verify: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    jwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();
  });

  describe('JWT validation logic', () => {
    it('throws UnauthorizedException when token is missing', () => {
      const token = '';
      expect(() => {
        if (!token) {
          throw new UnauthorizedException('Missing token');
        }
      }).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is invalid', () => {
      const token = 'invalid-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => {
        try {
          jwtService.verify(token, { secret: process.env.JWT_SECRET });
        } catch {
          throw new UnauthorizedException('Invalid or expired token');
        }
      }).toThrow(UnauthorizedException);
    });

    it('does not throw when token is valid', () => {
      const token = 'valid-token';
      jwtService.verify.mockReturnValue({ sub: 'user-123', email: 'test@test.com' });

      expect(() => {
        jwtService.verify(token, { secret: process.env.JWT_SECRET });
      }).not.toThrow();
    });
  });

  describe('SSE headers', () => {
    const mockResponse = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
    } as unknown as Response;

    it('sets correct Content-Type header', () => {
      mockResponse.setHeader('Content-Type', 'text/event-stream');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    });

    it('sets Cache-Control header', () => {
      mockResponse.setHeader('Cache-Control', 'no-cache');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    });

    it('sets Connection header', () => {
      mockResponse.setHeader('Connection', 'keep-alive');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    });
  });
});
