import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { TokenGuard } from '@/auth/guards/token.guard';
import { CreateScenarioGroupDto } from '@/scenario/dtos/scenario-group.dto';
import { ScenarioGroupService } from '@/scenario/services/scenario-group.service';
import { RequestWithUser } from '@/shared/types/request.types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

@ApiBearerAuth()
@ApiTags('api/v1/scenario-groups')
@Controller('api/v1/scenario-groups')
@UseGuards(TokenGuard, RolesGuard)
export class ScenarioGroupController {
  constructor(private readonly scenarioGroupService: ScenarioGroupService) {}

  @Get()
  @ApiOperation({ summary: 'Get all scenario groups' })
  @ApiResponse({
    status: 200,
    description: 'Scenario groups retrieved successfully',
  })
  @Roles(Role.User)
  async findAll(@Request() req: RequestWithUser) {
    const scenarioGroups = await this.scenarioGroupService.findAll({
      userId: req.user.userId,
    });

    return {
      message: 'Scenario groups retrieved successfully',
      ...scenarioGroups,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new scenario' })
  @ApiResponse({ status: 201, description: 'Scenario created successfully' })
  @Roles(Role.User)
  async create(
    @Request() req: RequestWithUser,
    @Body() createScenarioGroupDto: CreateScenarioGroupDto,
  ) {
    const scenarioGroup = await this.scenarioGroupService.create({
      userId: req.user.userId,
      data: createScenarioGroupDto,
    });

    return {
      message: 'Scenario group created successfully',
      scenarioGroup,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scenario group' })
  @ApiResponse({
    status: 200,
    description: 'Scenario group updated successfully',
  })
  @Roles(Role.User)
  async update(
    @Param('id') id: string,
    @Body() updateScenarioGroupDto: Partial<CreateScenarioGroupDto>,
  ) {
    const scenarioGroup = await this.scenarioGroupService.update({
      id,
      data: updateScenarioGroupDto,
    });

    return {
      message: 'Scenario group updated successfully',
      scenarioGroup,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a scenario group' })
  @ApiResponse({
    status: 200,
    description: 'Scenario group deleted successfully',
  })
  @Roles(Role.User)
  async delete(@Param('id') id: string) {
    const scenarioGroup = this.scenarioGroupService.delete({ id });
    return {
      message: 'Scenario group deleted successfully',
      scenarioGroup,
    };
  }
}
