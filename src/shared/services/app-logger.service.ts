import { Injectable, Logger, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLoggerService extends Logger implements LoggerService {
  protected context = 'AppLoggerService';

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    super.log(message, context || AppLoggerService.name);
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context || AppLoggerService.name);
  }

  warn(message: string, context?: string) {
    super.warn(message, context || AppLoggerService.name);
  }

  debug(message: string, context?: string) {
    super.debug(message, context || AppLoggerService.name);
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context || AppLoggerService.name);
  }
}
