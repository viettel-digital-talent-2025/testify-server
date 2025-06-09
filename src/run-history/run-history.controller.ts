import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { TokenGuard } from '@/auth/guards/token.guard';
import {
  RunHistoryQueryRequestDto,
  RunHistoryWithScenarioName,
} from '@/run-history/dtos/run-history.dto';
import { RunHistoryService } from '@/run-history/run-history.service';
import { RequestWithUser } from '@/shared/types/request.types';
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, RunHistoryStatus } from '@prisma/client';

@ApiTags('Run History')
@Controller('api/v1/run-history')
@UseGuards(TokenGuard, RolesGuard)
export class RunHistoryController {
  constructor(private readonly service: RunHistoryService) {}

  @Get('scenario/:scenarioId')
  @ApiOperation({
    summary: 'Get run history records by scenario ID with filtering',
  })
  @ApiParam({ name: 'scenarioId', description: 'Scenario ID' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for scenario name',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: [
      'runAt',
      'avgLatency',
      'p95Latency',
      'throughput',
      'errorRate',
      'createdAt',
    ],
    description: 'Field to order by',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Order direction',
  })
  @ApiQuery({
    name: 'timeStart',
    required: false,
    type: String,
    description: 'Start time filter (ISO date string)',
  })
  @ApiQuery({
    name: 'timeEnd',
    required: false,
    type: String,
    description: 'End time filter (ISO date string)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RunHistoryStatus,
    isArray: true,
    description: 'Filter by status (can be multiple, comma-separated)',
  })
  @Roles(Role.User)
  async findAll(
    @Req() req: RequestWithUser,
    @Param('scenarioId') scenarioId: string,
    @Query() query: RunHistoryQueryRequestDto,
  ): Promise<{ data: RunHistoryWithScenarioName[]; total: number }> {
    const userId = req.user.userId;
    const where = this.service.buildWhere(query, userId, scenarioId);
    const paging = this.service.buildPaging(query, userId);
    return this.service.findAll({ where, ...paging });
  }
}
