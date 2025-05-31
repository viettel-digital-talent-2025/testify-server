import { ApiProperty } from '@nestjs/swagger';
import { ScenarioFlowStepType } from '@prisma/client';
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

export class UpdateStepDto {
  @ApiProperty({
    description: 'The ID of the step',
    example: 'step-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  id?: string;

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
    example: 'HTTP',
    required: true,
  })
  @IsEnum(ScenarioFlowStepType)
  type: ScenarioFlowStepType;

  @ApiProperty({
    description: 'The config of the step',
    example: { url: 'https://api.example.com' },
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

export class UpdateFlowDto {
  @ApiProperty({
    description: 'The ID of the flow',
    example: 'flow-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  id?: string;

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
    example: [UpdateStepDto],
    required: true,
  })
  @IsArray()
  @Type(() => UpdateStepDto)
  steps: UpdateStepDto[];
}

export class UpdateScenarioDto {
  @ApiProperty({
    description: 'The flows of the scenario',
    example: [UpdateFlowDto],
    required: true,
  })
  @IsArray()
  @Type(() => UpdateFlowDto)
  flows: UpdateFlowDto[];
}
