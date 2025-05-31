import { RolesGuard } from '@/auth/guards/roles.guard';
import { TokenGuard } from '@/auth/guards/token.guard';
import { RequestWithUser } from '@/shared/types/request.types';
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role, RunHistory } from '@prisma/client';
import { merge, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  LoadTestsService,
  ScenarioStatusUpdate,
} from '../services/load-tests.service';
import { MetricsService } from '../services/metrics.service';
import { LoadTestCompletedEvent } from '../types/load-test.types';

@ApiTags('api/v1/load-tests')
@Controller('api/v1/load-tests')
export class LoadTestsController {
  constructor(
    private readonly loadTestsService: LoadTestsService,
    private readonly metricsService: MetricsService,
  ) {}

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
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Scenario not found',
  })
  @UseGuards(TokenGuard, RolesGuard)
  @Roles(Role.User)
  async runTest(
    @Param('scenarioId') scenarioId: string,
    @Req() req: RequestWithUser,
  ): Promise<RunHistory> {
    return this.loadTestsService.runTest(scenarioId, req.user.userId);
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
  @UseGuards(TokenGuard, RolesGuard)
  @Roles(Role.User)
  async stopTest(
    @Param('scenarioId') scenarioId: string,
    @Req() req: RequestWithUser,
  ): Promise<RunHistory> {
    return await this.loadTestsService.stopTest(scenarioId, req.user.userId);
  }

  @Sse(':scenarioId/status')
  loadTestStatus(
    @Param('scenarioId') scenarioId: string,
    @Req() req: RequestWithUser,
  ): Observable<{
    data: string;
    type: string;
    id: string;
    retry: number;
  }> {
    const { stream, lastStatus } =
      this.metricsService.getCurrentStatus(scenarioId);

    const formatEvent = (event: LoadTestCompletedEvent) => ({
      data: JSON.stringify(event),
      type: 'message',
      id: event.runHistoryId,
      retry: 10000, // Retry connection every 10 seconds if disconnected
    });

    if (stream) {
      // If we have a current stream, send last known status first (if exists) then stream updates
      const initialStatus$ = lastStatus ? of(lastStatus) : of();
      return merge(initialStatus$, stream).pipe(map(formatEvent));
    }

    // If no current stream, just subscribe to future updates
    return this.metricsService
      .subscribeToLoadTestStatus(scenarioId)
      .pipe(map(formatEvent));
  }

  @Sse('status/:userId')
  loadUserTestStatus(@Param('userId') userId: string): Observable<{
    data: string;
    type: string;
    id: string;
    retry: number;
  }> {
    const { stream } = this.loadTestsService.getCurrentUserStatus(userId);

    const formatEvent = (event: ScenarioStatusUpdate) => ({
      data: JSON.stringify(event),
      type: 'message',
      id: `${event.scenarioId}:${event.runHistoryId}`,
      retry: 3000,
    });

    if (stream) {
      return stream.pipe(map(formatEvent));
    }

    return this.loadTestsService
      .subscribeToUserStatus(userId)
      .pipe(map(formatEvent));
  }
}
