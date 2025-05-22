import {
  IsString,
  IsInt,
  IsObject,
  IsOptional,
  Min,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScenarioFlowStepType, ScenarioType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

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
  groupId?: string;

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

export class UpdateScenarioDto extends CreateScenarioDto {
  declare groupId?: string;
}
