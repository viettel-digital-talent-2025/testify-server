import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma, RunHistoryStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type RunHistoryWhereInput = Prisma.RunHistoryWhereInput;
export type RunHistoryWhereUniqueInput = Prisma.RunHistoryWhereUniqueInput;

export interface RunHistoryMetrics {
  startTime: Date;
  endTime: Date;
  avgResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  successRate: number;
}

export interface RunHistoryWithMetrics {
  id: string;
  scenarioId: string;
  scenario: {
    id: string;
    name: string;
  };
  runAt: Date;
  vus: number;
  duration: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  status: RunHistoryStatus;
  rawResultUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RunHistoryWithScenario = Prisma.RunHistoryGetPayload<{
  include: {
    scenario: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

export class RunHistoryWithMetricsDto {
  @ApiProperty({ description: 'Unique identifier of the run history' })
  id: string;

  @ApiProperty({ description: 'ID of the associated scenario' })
  scenarioId: string;

  @ApiProperty({ description: 'When the test was run' })
  runAt: Date;

  @ApiProperty({ description: 'Number of virtual users' })
  vus: number;

  @ApiProperty({ description: 'Duration of the test in seconds' })
  duration: number;

  @ApiProperty({ description: 'Status of the test run' })
  status: string;

  @ApiProperty({ description: 'Success rate of the test (0-100)' })
  successRate: number;

  @ApiProperty({ description: 'Average response time in milliseconds' })
  avgResponseTime: number;

  @ApiProperty({ description: 'Error rate of the test (0-100)' })
  errorRate: number;

  @ApiProperty({ description: 'Requests per second' })
  requestsPerSecond: number;

  @ApiProperty({ description: 'When the record was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the record was last updated' })
  updatedAt: Date;
}

export class RunHistoryListResponseDto {
  @ApiProperty({
    type: [RunHistoryWithMetricsDto],
    description: 'List of run history records',
  })
  data: RunHistoryWithMetricsDto[];

  @ApiProperty({ description: 'Total number of records' })
  total: number;
}

export class RunHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Search term for scenario name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Number of records to skip' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  skip?: number;

  @ApiPropertyOptional({ description: 'Number of records to take' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  take?: number;

  @ApiPropertyOptional({
    description: 'Field to order by',
    enum: [
      'runAt',
      'vus',
      'duration',
      'successRate',
      'avgResponseTime',
      'requestsPerSecond',
      'createdAt',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'runAt',
    'vus',
    'duration',
    'successRate',
    'avgResponseTime',
    'requestsPerSecond',
    'createdAt',
  ])
  orderBy?: string;

  @ApiPropertyOptional({
    description: 'Order direction',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Start time filter (ISO date string)',
    type: String,
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time filter (ISO date string)',
    type: String,
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Filter by status (can be multiple, comma-separated)',
    enum: RunHistoryStatus,
    isArray: true,
  })
  @IsOptional()
  @IsString({ each: true })
  status?: string | string[];
}
