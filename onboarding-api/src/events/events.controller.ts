import { Controller, Get, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { EventsService } from './events.service';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
  ) {}

  // Marked @Public() to bypass JwtAuthGuard — we validate the token manually
  // below because the browser's native EventSource cannot set custom headers.
  @Public()
  @Get('stream')
  @ApiOperation({
    summary: 'SSE stream — subscribe to real-time business events',
    description:
      'Pass the JWT access token as ?token=<jwt>. The browser EventSource API ' +
      'does not support custom headers, so token is sent as a query parameter.',
  })
  @ApiQuery({ name: 'token', description: 'JWT access token', required: true })
  stream(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Manual JWT validation (replaces the guard that can't run here)
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disables nginx buffering
    res.flushHeaders();

    // Initial confirmation event
    res.write('event: connected\ndata: {}\n\n');

    // Keep-alive ping — prevents proxies from closing idle connections
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25_000);

    const connectionId = randomUUID();

    this.eventsService.addListener(connectionId, (event) => {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on('close', () => {
      clearInterval(heartbeat);
      this.eventsService.removeListener(connectionId);
    });
  }
}