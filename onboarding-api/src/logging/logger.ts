import winston, { Logger as WinstonLogger } from 'winston';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

const logLevel = configService.get<string>('LOG_LEVEL') || 'info';
const isDevelopment = configService.get<string>('NODE_ENV') !== 'production';

const jsonFormat = winston.format((info) => {
  info.timestamp = new Date().toISOString();
  return info;
});

const transportsList: winston.transport[] = [];

if (isDevelopment) {
  transportsList.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          let log = `${timestamp} ${level}: ${message}`;
          if (Object.keys(metadata).length > 0) {
            log += ` ${JSON.stringify(metadata)}`;
          }
          return log;
        }),
      ),
    }),
  );
} else {
  transportsList.push(
    new winston.transports.Console({
      format: winston.format.combine(jsonFormat(), winston.format.json()),
    }),
  );
}

try {
  transportsList.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(jsonFormat(), winston.format.json()),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(jsonFormat(), winston.format.json()),
    }),
  );
} catch (e) {
  // Files might not be writable in some environments
}

const baseLoggerOptions: winston.LoggerOptions = {
  level: logLevel,
  format: winston.format.combine(jsonFormat()),
  defaultMeta: {
    service: 'onboarding-api',
    environment: configService.get<string>('NODE_ENV') || 'development',
  },
  transports: transportsList,
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      format: winston.format.combine(jsonFormat(), winston.format.json()),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      format: winston.format.combine(jsonFormat(), winston.format.json()),
    }),
  ],
};

class NestLikeLogger {
  constructor(
    private readonly logger: WinstonLogger,
    private readonly context?: string,
  ) {}

  log(message: string) {
    this.logger.info(message, { context: this.context });
  }

  error(message: string, trace?: string) {
    this.logger.error(message, { trace, context: this.context });
  }

  warn(message: string) {
    this.logger.warn(message, { context: this.context });
  }

  debug(message: string) {
    this.logger.debug(message, { context: this.context });
  }

  verbose(message: string) {
    this.logger.verbose(message, { context: this.context });
  }
}

export const createLogger = (context?: string): NestLikeLogger => {
  const logger = winston.createLogger(baseLoggerOptions);
  return new NestLikeLogger(logger, context);
};

export const logger = createLogger('App');
