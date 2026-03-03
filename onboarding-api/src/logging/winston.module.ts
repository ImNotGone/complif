import { Global, Module, DynamicModule, Provider } from '@nestjs/common';
import { WinstonModuleAsyncOptions } from './winston.interface';
import { createLogger } from './logger';
import { WinstonService } from './winston.service';

@Global()
@Module({
  providers: [WinstonService],
  exports: [WinstonService],
})
export class WinstonModule {
  static forRoot(options?: WinstonModuleAsyncOptions): DynamicModule {
    const logger = createLogger(options?.context || options?.useContext);
    
    const loggerProvider: Provider = {
      provide: 'WINSTON_LOGGER',
      useValue: logger,
    };

    return {
      module: WinstonModule,
      providers: [loggerProvider],
      exports: [loggerProvider],
    };
  }

  static forRootAsync(options: WinstonModuleAsyncOptions): DynamicModule {
    const loggerProvider: Provider = {
      provide: 'WINSTON_LOGGER',
      useFactory: () => createLogger(options.useContext),
    };

    return {
      module: WinstonModule,
      imports: options.imports,
      providers: [loggerProvider],
      exports: [loggerProvider],
    };
  }
}
