import {
  RunHistoryListResponseDto,
  RunHistoryQueryDto,
  RunHistoryWithMetrics,
  RunHistoryWithMetricsDto,
} from '@/run-history/run-history.dto';
import { RunHistoryService } from '@/run-history/run-history.service';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RunHistoryStatus } from '@prisma/client';

@ApiTags('Run History')
@Controller('api/v1/run-history')
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
      'vus',
      'duration',
      'successRate',
      'avgResponseTime',
      'requestsPerSecond',
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
  @ApiResponse({
    status: 200,
    description: 'List of run history records',
    type: RunHistoryListResponseDto,
  })
  async findAll(
    @Param('scenarioId') scenarioId: string,
    @Query() query: RunHistoryQueryDto,
  ): Promise<{ data: RunHistoryWithMetrics[]; total: number }> {
    const where = this.service.buildWhere(query, scenarioId);
    const paging = this.service.buildPaging(query);

    return this.service.findAll({ where, ...paging });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a run history record by ID' })
  @ApiParam({ name: 'id', description: 'Run history ID' })
  @ApiResponse({
    status: 200,
    description: 'Run history found',
    type: RunHistoryWithMetricsDto,
  })
  @ApiResponse({ status: 404, description: 'Run history not found' })
  async findOne(@Param('id') id: string): Promise<RunHistoryWithMetrics> {
    try {
      return await this.service.findOne({ id });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Run history not found with id: ${id}`);
    }
  }
}
