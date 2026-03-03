import { Injectable, Inject, Optional } from '@nestjs/common';
import { Logger } from 'winston';

@Injectable()
export class WinstonService {
  constructor(
    @Optional()
    @Inject('WINSTON_LOGGER')
    private readonly logger?: Logger,
  ) {}

  log(message: any, context?: string) {
    if (this.logger) {
      this.logger.info(message, { context });
    } else {
      console.log(message, { context });
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (this.logger) {
      this.logger.error(message, { trace, context });
    } else {
      console.error(message, { trace, context });
    }
  }

  warn(message: any, context?: string) {
    if (this.logger) {
      this.logger.warn(message, { context });
    } else {
      console.warn(message, { context });
    }
  }

  debug(message: any, context?: string) {
    if (this.logger) {
      this.logger.debug(message, { context });
    } else {
      console.debug(message, { context });
    }
  }

  verbose(message: any, context?: string) {
    if (this.logger) {
      this.logger.verbose(message, { context });
    } else {
      console.log(message, { context });
    }
  }

  child(options: any): WinstonService {
    const childLogger = this.logger?.child(options);
    const service = new WinstonService();
    (service as any).logger = childLogger;
    return service;
  }
}
