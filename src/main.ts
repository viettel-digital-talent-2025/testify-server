import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import serverConfig from './shared/config';
import './shared/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  app.enableCors({ credentials: true, origin: true });
  await app.listen(serverConfig.PORT);
}
bootstrap();
