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
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

@ApiTags('api/v1/metrics')
@Controller('api/v1/metrics')
@UseGuards(TokenGuard, RolesGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('/:scenarioId/:runHistoryId')
  @ApiOperation({ summary: 'Get realtime metrics for a scenario' })
  @ApiParam({
    name: 'scenarioId',
    description: 'ID of the scenario',
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
  @Roles(Role.User)
  async getMetrics(
    @Req() req: RequestWithUser,
    @Param('scenarioId') scenarioId: string,
    @Param('runHistoryId') runHistoryId: string,
    @Query('duration') duration?: string,
    @Query('flow_id') flowId?: string,
    @Query('step_id') stepId?: string,
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
