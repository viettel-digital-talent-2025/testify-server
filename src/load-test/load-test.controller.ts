import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LoadTestService } from './load-test.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Role, RunHistory, RunHistoryStatus } from '@prisma/client';
import { TokenGuard } from 'src/auth/guards/token.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

class RunHistoryResponse implements Partial<RunHistory> {
  id: string;
  status: RunHistoryStatus;
  runAt: Date;
  vus: number;
  duration: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  rawResultUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@ApiTags('api/v1/load-tests')
@Controller('api/v1/load-tests')
@UseGuards(TokenGuard, RolesGuard)
export class LoadTestController {
  constructor(private readonly loadTestService: LoadTestService) {}

  @Post(':scenarioId/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run a load test for a scenario' })
  @ApiParam({
    name: 'scenarioId',
    description: 'ID of the scenario to run',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Load test started successfully',
    type: RunHistoryResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Scenario not found',
  })
  @Roles(Role.User)
  async runTest(@Param('scenarioId') scenarioId: string): Promise<RunHistory> {
    return this.loadTestService.runTest(scenarioId);
  }

  @Delete(':scenarioId/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop a running load test' })
  @ApiParam({
    name: 'scenarioId',
    description: 'ID of the scenario to stop',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Load test stopped successfully',
  })
  @Roles(Role.User)
  async stopTest(@Param('scenarioId') scenarioId: string): Promise<void> {
    await this.loadTestService.stopTest(scenarioId);
  }
}
