import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { BusinessStatus } from '@prisma/client';

export interface StatusChangedEvent {
  type: 'business.status_changed';
  businessId: string;
  businessName: string;
  previousStatus: BusinessStatus;
  newStatus: BusinessStatus;
  reason: string;
  changedBy: string; // email
  timestamp: string;
}

// Union — extend with more event types as needed
export type AppEvent = StatusChangedEvent;

const CHANNEL = 'app:events';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);

  // Separate clients are required: a subscribed Redis client cannot issue
  // regular commands, so publishing and subscribing need their own connections.
  private publisher: Redis;
  private subscriber: Redis;

  // SSE listeners registered by the controller — one per open client connection.
  // Key: a unique connection id, Value: callback that writes to the SSE stream.
  private listeners = new Map<string, (event: AppEvent) => void>();

  constructor(private config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
  }

  onModuleInit() {
    this.subscriber.subscribe(CHANNEL, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to Redis channel: ${err.message}`);
      } else {
        this.logger.log(`Subscribed to Redis channel: ${CHANNEL}`);
      }
    });

    this.subscriber.on('message', (_channel: string, raw: string) => {
      try {
        const event: AppEvent = JSON.parse(raw);
        this.logger.debug(`Received event: ${event.type} | listeners: ${this.listeners.size}`);
        // Fan out to every SSE connection held by THIS instance
        this.listeners.forEach((cb) => cb(event));
      } catch (err) {
        this.logger.error(`Failed to parse event from Redis: ${err}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  // Called by BusinessesService after a status change is persisted
  async publish(event: AppEvent): Promise<void> {
    const payload = JSON.stringify(event);
    await this.publisher.publish(CHANNEL, payload);
    this.logger.log(`Published event: ${event.type} for business ${event.businessId}`);
  }

  // Called by the SSE controller to register a client connection
  addListener(id: string, cb: (event: AppEvent) => void): void {
    this.listeners.set(id, cb);
    this.logger.debug(`SSE client connected: ${id} (total: ${this.listeners.size})`);
  }

  // Called when the client disconnects
  removeListener(id: string): void {
    this.listeners.delete(id);
    this.logger.debug(`SSE client disconnected: ${id} (total: ${this.listeners.size})`);
  }
}