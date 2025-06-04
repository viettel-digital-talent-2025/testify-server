import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { TokenGuard } from '@/auth/guards/token.guard';
import { MetricsService } from '@/load-test/services/metrics.service';
import { MetricsResponse } from '@/load-test/types/metrics.types';
import { RequestWithUser } from '@/shared/types/request.types';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

@ApiTags('api/v1/metrics')
@Controller('api/v1/metrics')
// @UseGuards(TokenGuard, RolesGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('/:scenarioId/:runHistoryId')
  @ApiOperation({ summary: 'Get realtime metrics for a scenario' })
  @ApiResponse({
    status: 200,
    description: 'Returns realtime metrics for the specified scenario.',
    type: MetricsResponse,
  })
  @ApiResponse({ status: 404, description: 'Scenario or metrics not found.' })
  @ApiParam({
    name: 'scenarioId',
    description: 'ID of the scenario',
    type: 'string',
  })
  @ApiParam({
    name: 'runHistoryId',
    description: 'ID of the run history',
    type: 'string',
  })
  @ApiQuery({
    name: 'duration',
    description: 'Duration to query metrics for (e.g., "1m", "5m", "1h")',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'flow_id',
    description: 'Filter metrics by flow ID',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'step_id',
    description: 'Filter metrics by step ID',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'interval',
    description: 'Time interval for metrics aggregation',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'runAt',
    description: 'Start time of the metrics query',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'endAt',
    description: 'End time of the metrics query',
    required: false,
    type: 'string',
  })
  @UseGuards(TokenGuard, RolesGuard)
  @Roles(Role.User)
  async getMetrics(
    @Req() req: RequestWithUser,
    @Param('scenarioId') scenarioId: string,
    @Param('runHistoryId') runHistoryId: string,
    @Query('flow_id') flowId?: string,
    @Query('step_id') stepId?: string,
    @Query('duration') duration?: string,
    @Query('interval') interval?: string,
    @Query('runAt') runAt?: string,
    @Query('endAt') endAt?: string,
  ): Promise<MetricsResponse> {
    try {
      const tags = {
        ...(flowId && { flow_id: flowId }),
        ...(stepId && { step_id: stepId }),
      };

      return await this.metricsService.getMetrics({
        userId: req.user.userId,
        scenarioId,
        runHistoryId,
        duration,
        interval,
        runAt,
        endAt,
        tags: Object.keys(tags).length > 0 ? tags : undefined,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new NotFoundException(
        `Failed to get realtime metrics for scenario ${scenarioId}`,
      );
    }
  }

  @Get('/:userId/:scenarioId/:runHistoryId')
  @ApiOperation({ summary: 'Get realtime metrics for a scenario (AI Service)' })
  @ApiResponse({
    status: 200,
    description: 'Returns realtime metrics for the specified scenario.',
    type: MetricsResponse,
  })
  @ApiResponse({ status: 404, description: 'Scenario or metrics not found.' })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user',
    type: 'string',
  })
  @ApiParam({
    name: 'scenarioId',
    description: 'ID of the scenario',
    type: 'string',
  })
  @ApiParam({
    name: 'runHistoryId',
    description: 'ID of the run history',
    type: 'string',
  })
  @ApiQuery({
    name: 'duration',
    description: 'Duration to query metrics for (e.g., "1m", "5m", "1h")',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'flow_id',
    description: 'Filter metrics by flow ID',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'step_id',
    description: 'Filter metrics by step ID',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'interval',
    description: 'Time interval for metrics aggregation',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'runAt',
    description: 'Start time of the metrics query',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'endAt',
    description: 'End time of the metrics query',
    required: false,
    type: 'string',
  })
  async getMetricsForAiService(
    @Param('userId') userId: string,
    @Param('scenarioId') scenarioId: string,
    @Param('runHistoryId') runHistoryId: string,
    @Query('flow_id') flowId?: string,
    @Query('step_id') stepId?: string,
    @Query('duration') duration?: string,
    @Query('interval') interval?: string,
    @Query('runAt') runAt?: string,
    @Query('endAt') endAt?: string,
  ): Promise<MetricsResponse> {
    try {
      const tags = {
        ...(flowId && { flow_id: flowId }),
        ...(stepId && { step_id: stepId }),
      };

      return await this.metricsService.getMetrics({
        userId,
        scenarioId,
        runHistoryId,
        duration,
        interval,
        runAt,
        endAt,
        tags: Object.keys(tags).length > 0 ? tags : undefined,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new NotFoundException(
        `Failed to get realtime metrics for scenario ${scenarioId}`,
      );
    }
  }
}
