import { ApiProperty } from '@nestjs/swagger';
import { Scenario, Scheduler } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export type SchedulerWithScenario = Scheduler & { scenario: Scenario };

export class CreateSchedulerDto {
  @ApiProperty({ description: 'ID of the scenario to schedule' })
  @IsString()
  @IsNotEmpty()
  scenarioId: string;

  @ApiProperty({
    description: 'Timezone for the scheduler',
    example: 'UTC',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone: string;

  @ApiProperty({
    description: 'Start time of the scheduler',
    example: '2024-03-20T10:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  timeStart?: Date;

  @ApiProperty({
    description: 'End time of the scheduler',
    example: '2024-03-21T10:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  timeEnd?: Date;

  @ApiProperty({
    description: 'Config of the scheduler',
    example: {
      type: 'every_day',
      time: '10:00',
    },
  })
  @IsObject()
  config: CronConfig;
}

export interface CronConfig {
  type:
    | 'every_day'
    | 'every_x_hours'
    | 'every_weekday'
    | 'every_weekend'
    | 'every_monday'
    | 'monthly_day'
    | 'once';
  time?: string;
  day?: number;
  hours?: number;
  date?: string;
}

export class UpdateSchedulerDto extends CreateSchedulerDto {}
