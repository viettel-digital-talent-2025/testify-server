import { plainToInstance, Type } from 'class-transformer';
import { IsNumber, IsString, validateSync } from 'class-validator';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = fs.existsSync(path.resolve('.env.local'))
  ? '.env.local'
  : '.env';

config({
  path: envPath,
});

if (!fs.existsSync(path.resolve(envPath))) {
  throw new Error('Missing .env file!');
}

class ServerConfig {
  // postgres
  @Type(() => Number)
  @IsNumber()
  PORT: number;
  @IsString()
  DATABASE_URL: string;

  // redis
  @IsString()
  REDIS_HOST: string;
  @Type(() => Number)
  @IsNumber()
  REDIS_PORT: number;
  @IsString()
  REDIS_USER: string;
  @IsString()
  REDIS_PASSWORD: string;

  @Type(() => Number)
  @IsNumber()
  SALT_ROUNDS: number;

  @IsString()
  ACCESS_TOKEN_SECRET: string;
  @IsString()
  ACCESS_TOKEN_EXPIRATION: string;
  @IsString()
  REFRESH_TOKEN_SECRET: string;
  @IsString()
  REFRESH_TOKEN_EXPIRATION: string;

  // gmail
  @IsString()
  GMAIL_USER: string;
  @IsString()
  GMAIL_APP_PASSWORD: string;
  @IsString()
  GMAIL_FROM: string;
}

const serverConfig = plainToInstance(ServerConfig, process.env);
const e = validateSync(serverConfig);

if (e.length > 0) {
  const errors = e.map((error) => {
    return {
      property: error.property,
      constraints: error.constraints,
      value: error.value as string,
    };
  });

  throw new Error(`Config validation error: ${JSON.stringify(errors)}`);
}

export default serverConfig;
