import {
  Logger,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import './shared/config';
import serverConfig from './shared/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        console.error(errors);

        const firstError = errors[0];
        const constraints = firstError?.constraints;

        if (constraints && typeof constraints === 'object') {
          return new UnprocessableEntityException(
            Object.values(constraints).join(', '),
          );
        }

        return new UnprocessableEntityException('Validation failed');
      },
    }),
  );
  app.use(cookieParser());

  // Enable CORS for SSE
  app.enableCors({
    origin: [
      serverConfig.frontend.FRONTEND_URL,
      serverConfig.bottleneck.AI_SERVICE_URL,
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    exposedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = serverConfig.APP_PORT;
  const host = serverConfig.APP_HOST;
  await app.listen(port, host);
  logger.log(`Application is running on: http://${host}:${port}`);
}
bootstrap();
