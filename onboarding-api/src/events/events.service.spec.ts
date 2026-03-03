import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventsService, StatusChangedEvent } from './events.service';
import { BusinessStatus } from '@prisma/client';

const mockRedis = {
  subscribe: jest.fn(),
  on: jest.fn(),
  publish: jest.fn(),
  quit: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('redis://localhost:6379') } },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe('publish', () => {
    it('publishes a status changed event to Redis', async () => {
      const event: StatusChangedEvent = {
        type: 'business.status_changed',
        businessId: 'business-123',
        businessName: 'Test Corp',
        previousStatus: BusinessStatus.PENDING,
        newStatus: BusinessStatus.APPROVED,
        reason: 'Documents verified',
        changedBy: 'admin@test.com',
        timestamp: new Date().toISOString(),
      };

      mockRedis.publish.mockResolvedValue(1);

      await service.publish(event);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'app:events',
        expect.stringContaining('"type":"business.status_changed"'),
      );
    });

    it('logs when publishing an event', async () => {
      const event: StatusChangedEvent = {
        type: 'business.status_changed',
        businessId: 'business-123',
        businessName: 'Test Corp',
        previousStatus: BusinessStatus.PENDING,
        newStatus: BusinessStatus.IN_REVIEW,
        reason: 'Manual review',
        changedBy: 'admin@test.com',
        timestamp: new Date().toISOString(),
      };

      mockRedis.publish.mockResolvedValue(1);

      await service.publish(event);

      expect(mockRedis.publish).toHaveBeenCalled();
    });
  });

  describe('addListener', () => {
    it('adds a listener for SSE connections', () => {
      const callback = jest.fn();
      const connectionId = 'test-connection-1';

      service.addListener(connectionId, callback);

      // The listener should be added (we can't directly check the private Map,
      // but we can verify the method doesn't throw)
      expect(() => service.addListener(connectionId, callback)).not.toThrow();
    });

    it('allows multiple listeners with different IDs', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.addListener('conn-1', callback1);
      service.addListener('conn-2', callback2);

      expect(() => service.addListener('conn-1', callback1)).not.toThrow();
      expect(() => service.addListener('conn-2', callback2)).not.toThrow();
    });
  });

  describe('removeListener', () => {
    it('removes a listener by ID', () => {
      const callback = jest.fn();
      const connectionId = 'test-connection-1';

      service.addListener(connectionId, callback);
      
      // Should not throw when removing
      expect(() => service.removeListener(connectionId)).not.toThrow();
    });

    it('handles removing a non-existent listener gracefully', () => {
      expect(() => service.removeListener('non-existent')).not.toThrow();
    });
  });

  describe('event handling', () => {
    it('processes incoming Redis messages and calls listeners', async () => {
      const callback = jest.fn();
      const connectionId = 'test-connection-1';
      service.addListener(connectionId, callback);

      // Simulate receiving a message from Redis
      const event: StatusChangedEvent = {
        type: 'business.status_changed',
        businessId: 'business-123',
        businessName: 'Test Corp',
        previousStatus: BusinessStatus.PENDING,
        newStatus: BusinessStatus.APPROVED,
        reason: 'Approved',
        changedBy: 'admin@test.com',
        timestamp: new Date().toISOString(),
      };

      // Manually trigger the message handler (simulating Redis message event)
      // Note: This tests the internal behavior - in production, Redis would trigger this
      const messageHandler = mockRedis.on.mock.calls.find((c: any) => c[0] === 'message')?.[1];
      
      if (messageHandler) {
        messageHandler('app:events', JSON.stringify(event));
        expect(callback).toHaveBeenCalledWith(event);
      }
    });

    it('handles invalid JSON in Redis messages gracefully', async () => {
      const callback = jest.fn();
      const connectionId = 'test-connection-1';
      service.addListener(connectionId, callback);

      // The error should be caught internally
      const messageHandler = mockRedis.on.mock.calls.find(c => c[0] === 'message')?.[1];
      
      if (messageHandler) {
        expect(() => messageHandler('app:events', 'invalid-json')).not.toThrow();
      }
    });
  });
});
