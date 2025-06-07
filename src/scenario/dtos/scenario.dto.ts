import { ApiProperty } from '@nestjs/swagger';
import {
  Prisma,
  RunHistoryStatus,
  Scenario,
  ScenarioFlow,
  ScenarioFlowStep,
  ScenarioFlowStepType,
  ScenarioFlowType,
  ScenarioGroup,
  ScenarioType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ScenarioFlowStepDto {
  @ApiProperty({
    description: 'The name of the step',
    example: 'Step 1',
    required: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The description of the step',
    example: 'This is a description of the step',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The type of the step',
    example: 'Step 1',
    required: true,
  })
  @IsString()
  type: ScenarioFlowStepType;

  @ApiProperty({
    description: 'The config of the step',
    example: 'This is a config of the step',
    required: true,
  })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({
    description: 'The order of the step',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class ScenarioFlowDto {
  @ApiProperty({
    description: 'The name of the flow',
    example: 'Flow 1',
    required: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The description of the flow',
    example: 'This is a description of the flow',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The weight of the flow',
    example: 1,
    required: true,
  })
  @IsInt()
  @Min(1)
  weight: number;

  @ApiProperty({
    description: 'The order of the flow',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({
    description: 'The steps of the flow',
    example: [ScenarioFlowStepDto],
    required: true,
  })
  @IsArray()
  @Type(() => ScenarioFlowStepDto)
  steps: ScenarioFlowStepDto[];
}

export class CreateScenarioDto {
  @ApiProperty({
    description: 'The group id of the scenario',
    example: 'Group 1',
    required: false,
  })
  @IsString()
  @IsOptional()
  groupId: string;

  @ApiProperty({
    description: 'The name of the scenario',
    example: 'Scenario 1',
    required: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The description of the scenario',
    example: 'This is a description of the scenario',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The type of the scenario',
    example: 'ScenarioType.LoadTest',
    required: true,
  })
  @IsEnum(ScenarioType)
  type: ScenarioType;

  @ApiProperty({
    description: 'The flow type of the scenario',
    example: 'ScenarioFlowType.Sequential',
    required: true,
  })
  @IsEnum(ScenarioFlowType)
  flowType: ScenarioFlowType;

  @ApiProperty({
    description: 'The number of virtual users of the scenario',
    example: 1,
    required: true,
  })
  @IsInt()
  @Min(1)
  vus: number;

  @ApiProperty({
    description: 'The duration of the scenario',
    example: 1,
    required: true,
  })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({
    description: 'The flows of the scenario',
    example: [ScenarioFlowDto],
    required: true,
  })
  @IsArray()
  @Type(() => ScenarioFlowDto)
  flows: ScenarioFlowDto[];
}

export class UpdateStepDto extends ScenarioFlowStepDto {
  @ApiProperty({
    description: 'The id of the step',
    example: 'Step 1',
    required: false,
  })
  @IsString()
  @IsOptional()
  id?: string;
}

export class UpdateFlowDto extends ScenarioFlowDto {
  @ApiProperty({
    description: 'The id of the flow',
    example: 'Flow 1',
    required: false,
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'The steps of the flow',
    example: [UpdateStepDto],
    required: true,
  })
  @IsArray()
  @Type(() => UpdateStepDto)
  declare steps: UpdateStepDto[];
}
export class UpdateScenarioDto extends CreateScenarioDto {
  @ApiProperty({
    description: 'The flows of the scenario',
    example: [ScenarioFlowDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @Type(() => UpdateFlowDto)
  declare flows: UpdateFlowDto[];
}

export type CreateScenarioInput = Prisma.ScenarioCreateInput;
export type UpdateScenarioInput = Prisma.ScenarioUpdateInput;

export interface ScenarioFlowsWithSteps extends ScenarioFlow {
  steps: ScenarioFlowStep[];
}

export interface ScenarioDto extends Scenario {
  group: ScenarioGroup | null;
  flows: ScenarioFlowsWithSteps[];
  runHistories: {
    id: string;
    status: RunHistoryStatus;
    runAt: Date | null;
    endAt: Date | null;
    progress: number;
  }[];
}
