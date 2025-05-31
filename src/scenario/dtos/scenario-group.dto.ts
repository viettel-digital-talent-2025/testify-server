import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
}
