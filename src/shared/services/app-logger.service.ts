import { Injectable, Logger, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLoggerService extends Logger implements LoggerService {
  protected context = 'AppLoggerService';

  setContext(context: string) {
    this.context = context;
  }

  log(message: string) {
    super.log(message);
  }

  error(message: string, trace?: string) {
    super.error(message, trace);
  }

  warn(message: string) {
    super.warn(message);
  }

  debug(message: string) {
    super.debug(message);
  }

  verbose(message: string) {
    super.verbose(message);
  }
}
