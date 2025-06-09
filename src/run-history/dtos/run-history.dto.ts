import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  Prisma,
  RunHistory,
  RunHistoryMetrics,
  RunHistoryStatus,
  Scenario,
  ScenarioFlow,
  ScenarioFlowStep,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RunHistoryQueryRequestDto {
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
      'avgLatency',
      'p95Latency',
      'throughput',
      'errorRate',
      'createdAt',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'runAt',
    'avgLatency',
    'p95Latency',
    'throughput',
    'errorRate',
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

export interface CreateRunHistoryDto {
  scenarioId: string;
  userId: string;
  status?: RunHistoryStatus;
}

export interface UpdateRunHistoryDto {
  runAt?: Date;
  endAt?: Date;
  avgLatency?: number;
  p95Latency?: number;
  throughput?: number;
  errorRate?: number;
  progress?: number;
  status?: RunHistoryStatus;
}

interface ScenarioFlowWithSteps extends ScenarioFlow {
  steps: ScenarioFlowStep[];
}

interface ScenarioWithFlows extends Scenario {
  flows: ScenarioFlowWithSteps[];
}

interface RunHistoryMetricsWithFlowAndStep extends RunHistoryMetrics {
  flow: {
    id: string;
    name: string;
  };
  step: {
    id: string;
    name: string;
  };
}

export interface RunHistoryWithScenarioAndMetrics extends RunHistory {
  scenario: ScenarioWithFlows;
  runHistoryMetrics: RunHistoryMetricsWithFlowAndStep[];
}

export interface RunHistoryWithScenarioName extends RunHistory {
  scenario: {
    id: string;
    name: string;
  };
}

export type RunHistoryWhereInput = Prisma.RunHistoryWhereInput;
