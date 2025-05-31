import { plainToInstance, Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = fs.existsSync(path.resolve('.env.local'))
  ? '.env.local'
  : '.env';

config({ path: envPath });

if (!fs.existsSync(path.resolve(envPath))) {
  throw new Error('Missing .env file!');
}

// --- Sub-config classes ---

class PostgresConfig {
  @Type(() => Number)
  @IsNumber()
  PORT: number;

  @IsString()
  DATABASE_URL: string;
}

class RedisConfig {
  @IsString()
  REDIS_HOST: string;

  @Type(() => Number)
  @IsNumber()
  REDIS_PORT: number;

  @IsString()
  REDIS_USER: string;

  @IsString()
  REDIS_PASSWORD: string;
}

class InfluxDBConfig {
  @IsString()
  INFLUXDB_PORT: string;

  @IsString()
  INFLUXDB_HOST: string;

  @IsString()
  INFLUXDB_URL: string;

  @IsString()
  @IsOptional()
  INFLUXDB_USERNAME: string;

  @IsString()
  @IsOptional()
  INFLUXDB_PASSWORD: string;

  @IsString()
  INFLUXDB_BUCKET: string;

  @IsString()
  INFLUXDB_ORG: string;

  @IsString()
  @IsOptional()
  INFLUXDB_TOKEN: string;
}

class JwtConfig {
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
}

class GmailConfig {
  @IsString()
  GMAIL_USER: string;

  @IsString()
  GMAIL_APP_PASSWORD: string;

  @IsString()
  GMAIL_FROM: string;
}

class FrontendConfig {
  @IsString()
  FRONTEND_URL: string;
}

class LoadTestConfig {
  @IsString()
  TEMP_DIR: string;

  @IsString()
  INFLUXDB_URL: string;
}

// --- Main config ---

class ServerConfig {
  @Type(() => Number)
  @IsNumber()
  PORT: number;

  @ValidateNested()
  @Type(() => PostgresConfig)
  postgres: PostgresConfig;

  @ValidateNested()
  @Type(() => RedisConfig)
  redis: RedisConfig;

  @ValidateNested()
  @Type(() => InfluxDBConfig)
  influxdb: InfluxDBConfig;

  @ValidateNested()
  @Type(() => JwtConfig)
  jwt: JwtConfig;

  @ValidateNested()
  @Type(() => GmailConfig)
  gmail: GmailConfig;

  @ValidateNested()
  @Type(() => FrontendConfig)
  frontend: FrontendConfig;

  @ValidateNested()
  @Type(() => LoadTestConfig)
  loadTest: LoadTestConfig;
}

// --- Load and validate config ---

function mapEnvToStructuredObject(env: NodeJS.ProcessEnv): ServerConfig {
  const getRequiredEnv = (key: string): string => {
    const value = env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  };

  const getOptionalEnv = (key: string): string => {
    return env[key] || '';
  };

  const getRequiredNumberEnv = (key: string): number => {
    const value = getRequiredEnv(key);
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} must be a number`);
    }
    return num;
  };

  return {
    PORT: getRequiredNumberEnv('PORT'),
    postgres: {
      PORT: getRequiredNumberEnv('PORT'),
      DATABASE_URL: getRequiredEnv('DATABASE_URL'),
    },
    redis: {
      REDIS_HOST: getRequiredEnv('REDIS_HOST'),
      REDIS_PORT: getRequiredNumberEnv('REDIS_PORT'),
      REDIS_USER: getRequiredEnv('REDIS_USER'),
      REDIS_PASSWORD: getRequiredEnv('REDIS_PASSWORD'),
    },
    influxdb: {
      INFLUXDB_HOST: getRequiredEnv('INFLUXDB_HOST'),
      INFLUXDB_PORT: getRequiredEnv('INFLUXDB_PORT'),
      INFLUXDB_URL: getRequiredEnv('INFLUXDB_URL'),
      INFLUXDB_USERNAME: getOptionalEnv('INFLUXDB_USERNAME'),
      INFLUXDB_PASSWORD: getOptionalEnv('INFLUXDB_PASSWORD'),
      INFLUXDB_BUCKET: getRequiredEnv('INFLUXDB_BUCKET'),
      INFLUXDB_ORG: getRequiredEnv('INFLUXDB_ORG'),
      INFLUXDB_TOKEN: getOptionalEnv('INFLUXDB_TOKEN'),
    },
    jwt: {
      SALT_ROUNDS: getRequiredNumberEnv('SALT_ROUNDS'),
      ACCESS_TOKEN_SECRET: getRequiredEnv('ACCESS_TOKEN_SECRET'),
      ACCESS_TOKEN_EXPIRATION: getRequiredEnv('ACCESS_TOKEN_EXPIRATION'),
      REFRESH_TOKEN_SECRET: getRequiredEnv('REFRESH_TOKEN_SECRET'),
      REFRESH_TOKEN_EXPIRATION: getRequiredEnv('REFRESH_TOKEN_EXPIRATION'),
    },
    gmail: {
      GMAIL_USER: getRequiredEnv('GMAIL_USER'),
      GMAIL_APP_PASSWORD: getRequiredEnv('GMAIL_APP_PASSWORD'),
      GMAIL_FROM: getRequiredEnv('GMAIL_FROM'),
    },
    frontend: {
      FRONTEND_URL: getRequiredEnv('FRONTEND_URL'),
    },
    loadTest: {
      TEMP_DIR: getRequiredEnv('TEMP_DIR'),
      INFLUXDB_URL: getRequiredEnv('INFLUXDB_URL'),
    },
  };
}

const structuredEnv = mapEnvToStructuredObject(process.env);
const serverConfig = plainToInstance(ServerConfig, structuredEnv);
const errors = validateSync(serverConfig, { whitelist: true });

if (errors.length > 0) {
  interface ValidationError {
    property: string;
    constraints: Record<string, string>;
    value: unknown;
  }

  function isValidationError(error: unknown): error is ValidationError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'property' in error &&
      'constraints' in error &&
      'value' in error
    );
  }

  const formattedErrors: ValidationError[] = errors.map((error) => {
    if (!isValidationError(error)) {
      throw new Error('Invalid validation error format');
    }
    return {
      property: error.property,
      constraints: error.constraints || {},
      value: error.value,
    };
  });

  throw new Error(
    `Config validation error: ${JSON.stringify(formattedErrors, null, 2)}`,
  );
}

export default serverConfig;
