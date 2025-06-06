import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { TokenGuard } from '@/auth/guards/token.guard';
import {
  CreateScenarioDto,
  UpdateScenarioDto,
} from '@/scenario/dtos/scenario.dto';
import { ScenarioService } from '@/scenario/services/scenario.service';
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
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, RunHistory, Scenario } from '@prisma/client';

@ApiBearerAuth()
@ApiTags('Scenarios')
@Controller('api/v1/scenarios')
@UseGuards(TokenGuard, RolesGuard)
export class ScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {}

  @Get()
  @ApiOperation({ summary: 'Get all scenarios for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Return all scenarios',
    type: [CreateScenarioDto],
  })
  @Roles(Role.User)
  findAll(@Request() req: RequestWithUser): Promise<Scenario[]> {
    return this.scenarioService.findAll({ userId: req.user.userId });
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get all scenarios for a group' })
  @ApiResponse({
    status: 200,
    description: 'Return all scenarios for a group',
    type: [CreateScenarioDto],
  })
  @Roles(Role.User)
  findAllByGroupId(
    @Request() req: RequestWithUser,
    @Param('groupId') groupId: string,
  ): Promise<Scenario[]> {
    return this.scenarioService.findAllByGroupId({
      groupId,
      userId: req.user.userId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a scenario by id' })
  @ApiResponse({
    status: 200,
    description: 'Return the scenario',
    type: CreateScenarioDto,
  })
  @ApiResponse({ status: 404, description: 'Scenario not found' })
  @Roles(Role.User)
  findOne(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<Scenario> {
    return this.scenarioService.findOne({ id, userId: req.user.userId });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new scenario' })
  @ApiBody({ type: CreateScenarioDto })
  @ApiResponse({
    status: 201,
    description: 'Scenario created successfully',
    type: CreateScenarioDto,
  })
  @Roles(Role.User)
  create(
    @Body() createScenarioDto: CreateScenarioDto,
    @Request() req: RequestWithUser,
  ): Promise<Scenario> {
    return this.scenarioService.create({
      userId: req.user.userId,
      data: createScenarioDto,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scenario' })
  @ApiBody({ type: UpdateScenarioDto })
  @ApiResponse({
    status: 200,
    description: 'Scenario updated successfully',
    type: CreateScenarioDto,
  })
  @ApiResponse({ status: 404, description: 'Scenario not found' })
  @Roles(Role.User)
  update(
    @Param('id') id: string,
    @Body() updateScenarioDto: UpdateScenarioDto,
    @Request() req: RequestWithUser,
  ): Promise<Scenario> {
    return this.scenarioService.update({
      id,
      data: updateScenarioDto,
      userId: req.user.userId,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a scenario' })
  @ApiResponse({
    status: 200,
    description: 'Scenario deleted successfully',
    type: CreateScenarioDto,
  })
  @ApiResponse({ status: 404, description: 'Scenario not found' })
  @Roles(Role.User)
  remove(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<Scenario> {
    return this.scenarioService.remove({ id, userId: req.user.userId });
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get load test history for a scenario' })
  @ApiResponse({
    status: 200,
    description: 'Return test history',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Scenario not found' })
  @Roles(Role.User)
  getTestHistory(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<RunHistory[]> {
    return this.scenarioService.getTestHistory({
      id,
      userId: req.user.userId,
    });
  }
}
