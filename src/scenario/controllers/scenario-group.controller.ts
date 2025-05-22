import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { TokenGuard } from 'src/auth/guards/token.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { CreateScenarioGroupDto } from '../dtos/scenario-group.dto';
import { ScenarioGroupService } from '../services/scenario-group.service';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';

interface RequestWithUser extends ExpressRequest {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

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
    const scenarioGroups = await this.scenarioGroupService.findAll(
      req.user.userId,
    );

    return {
      message: 'Scenario groups retrieved successfully',
      scenarioGroups,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new scenario' })
  @ApiResponse({ status: 201, description: 'Scenario created successfully' })
  @Roles(Role.User)
  create(
    @Request() req: RequestWithUser,
    @Body() createScenarioGroupDto: CreateScenarioGroupDto,
  ) {
    const scenarioGroup = this.scenarioGroupService.create(
      req.user.userId,
      createScenarioGroupDto,
    );

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
  update(
    @Param('id') id: string,
    @Body() updateScenarioGroupDto: Partial<CreateScenarioGroupDto>,
  ) {
    const scenarioGroup = this.scenarioGroupService.update(
      id,
      updateScenarioGroupDto,
    );
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
  delete(@Param('id') id: string) {
    console.log('id', id);
    const scenarioGroup = this.scenarioGroupService.delete(id);
    return {
      message: 'Scenario group deleted successfully',
      scenarioGroup,
    };
  }
}
