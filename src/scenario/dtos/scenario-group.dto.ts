import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScenarioGroupDto {
  @ApiProperty({
    description: 'Name of the scenario group',
    example: 'Group 1',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the scenario group',
    example: 'This is a description of the scenario group',
    required: false,
  })
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty({
    description: 'Color of the scenario group',
    example: '#000000',
    required: false,
  })
  @IsString()
  @IsOptional()
  color: string;
}

export class ScenarioGroupDto {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  count: number;
}
