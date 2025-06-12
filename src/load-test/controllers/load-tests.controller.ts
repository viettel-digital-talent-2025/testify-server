import { RolesGuard } from '@/auth/guards/roles.guard';
import { TokenGuard } from '@/auth/guards/token.guard';
import { RequestWithUser } from '@/shared/types/request.types';
import { SSEEvent } from '@/shared/types/sse.types';
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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { LoadTestsService } from '../services/load-tests.service';
import { LoadTestStatusEvent } from '../types/load-test.types';

@ApiTags('api/v1/load-tests')
@Controller('api/v1/load-tests')
export class LoadTestsController {
  constructor(private readonly loadTestsService: LoadTestsService) {}

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
    return this.loadTestsService.runTest({
      scenarioId,
      userId: req.user.userId,
    });
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
    return await this.loadTestsService.stopTest({
      scenarioId,
      userId: req.user.userId,
    });
  }

  @Sse('status/:userId')
  async loadUserTestStatus(
    @Param('userId') userId: string,
  ): Promise<Observable<SSEEvent<LoadTestStatusEvent>>> {
    const { stream } = this.loadTestsService.getCurrentUserStatus({ userId });

    const formatEvent = (event: SSEEvent<LoadTestStatusEvent>) => ({
      data: event.data,
      event: event.event,
      id: event.id,
      retry: 3000,
    });

    if (stream) {
      return stream.pipe(map(formatEvent));
    }

    return (await this.loadTestsService.subscribeToUserStatus({ userId })).pipe(
      map(formatEvent),
    );
  }
}
