import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { TokenGuard } from '@/auth/guards/token.guard';
import { MetricsService } from '@/load-test/services/metrics.service';
import { MetricsResponse } from '@/load-test/types/metrics.types';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import { RequestWithUser } from '@/shared/types/request.types';
import {
  Controller,
  Get,
  InternalServerErrorException,
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
export class MetricsController {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('/:scenarioId/:runHistoryId')
  @ApiOperation({ summary: 'Get realtime metrics for a scenario' })
  @ApiResponse({
    status: 200,
    description: 'Returns realtime metrics for the specified scenario.',
  })
  @ApiResponse({ status: 404, description: 'Scenario or metrics not found.' })
  @ApiParam({
    name: 'runHistoryId',
    description: 'ID of the run history',
    type: 'string',
  })
  @ApiParam({
    name: 'scenarioId',
    description: 'ID of the scenario',
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
    description:
      'Time interval for metrics aggregation (e.g., "5s", "1m", "1h")',
    required: false,
    type: 'string',
    default: '1m',
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
    @Param('runHistoryId') runHistoryId: string,
    @Param('scenarioId') scenarioId: string,
    @Query('flow_id') flowId?: string,
    @Query('step_id') stepId?: string,
    @Query('interval') interval = '1m',
    @Query('runAt') runAt?: string,
    @Query('endAt') endAt?: string,
  ): Promise<MetricsResponse> {
    try {
      const tags = {
        ...(flowId && { flow_id: flowId }),
        ...(stepId && { step_id: stepId }),
      };

      const metrics = await this.metricsService.getMetrics({
        runHistoryId,
        scenarioId,
        userId: req.user.userId,
        interval,
        runAt,
        endAt,
        tags: Object.keys(tags).length > 0 ? tags : undefined,
      });

      return metrics as MetricsResponse;
    } catch (error) {
      this.logger.error(
        `Failed to get realtime metrics for scenario ${scenarioId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Failed to get realtime metrics for scenario',
      );
    }
  }

  @Get('/:userId/:scenarioId/:runHistoryId')
  @ApiOperation({ summary: 'Get realtime metrics for a scenario (AI Service)' })
  @ApiResponse({
    status: 200,
    description: 'Returns realtime metrics for the specified scenario.',
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
    description:
      'Time interval for metrics aggregation (e.g., "5s", "1m", "1h")',
    required: false,
    type: 'string',
    default: '1m',
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
    @Param('runHistoryId') runHistoryId: string,
    @Param('scenarioId') scenarioId: string,
    @Query('flow_id') flowId?: string,
    @Query('step_id') stepId?: string,
    @Query('interval') interval = '1m',
    @Query('runAt') runAt?: string,
    @Query('endAt') endAt?: string,
  ): Promise<MetricsResponse> {
    try {
      const tags = {
        ...(flowId && { flow_id: flowId }),
        ...(stepId && { step_id: stepId }),
      };

      return await this.metricsService.getMetrics({
        runHistoryId,
        scenarioId,
        userId,
        interval,
        runAt,
        endAt,
        tags: Object.keys(tags).length > 0 ? tags : undefined,
      });
    } catch (error) {
      this.logger.error(
        `Failed to get realtime metrics for scenario ${scenarioId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException(
        'Failed to get realtime metrics for scenario',
      );
    }
  }
}
