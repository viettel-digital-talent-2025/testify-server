import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { TokenGuard } from '@/auth/guards/token.guard';
import { RequestWithUser } from '@/shared/types/request.types';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Observable } from 'rxjs';
import { SseEvent } from './bottlenecks.dto';
import { BottlenecksService } from './bottlenecks.service';

@ApiTags('api/v1/bottlenecks')
@Controller('api/v1/bottlenecks')
export class BottlenecksController {
  constructor(private readonly bottlenecksService: BottlenecksService) {}

  @Sse('alerts/:userId')
  @ApiOperation({ summary: 'Subscribe to user bottleneck alerts' })
  @ApiResponse({
    status: 200,
    description: 'Returns an SSE stream of bottleneck alerts for the user.',
    type: SseEvent,
  })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user to subscribe to alerts for',
    type: 'string',
  })
  alerts(@Param('userId') userId: string): Observable<SseEvent> {
    return this.bottlenecksService.subscribeToUserAlerts(userId);
  }

  @Get('run-history')
  @ApiOperation({ summary: 'Get bottleneck run history for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns the bottleneck run history for the current user.',
  })
  @UseGuards(TokenGuard, RolesGuard)
  @Roles(Role.User)
  async getBottlenecksRunHistory(@Req() req: RequestWithUser) {
    return this.bottlenecksService.getBottlenecksRunHistory(req.user.userId);
  }

  @Get('run-history/:runHistoryId')
  @ApiOperation({ summary: 'Get bottlenecks for a specific run history' })
  @ApiResponse({
    status: 200,
    description: 'Returns bottlenecks for the specified run history.',
  })
  @ApiResponse({ status: 404, description: 'Run history not found.' })
  @ApiParam({
    name: 'runHistoryId',
    description: 'ID of the run history to get bottlenecks for',
    type: 'string',
  })
  @UseGuards(TokenGuard, RolesGuard)
  @Roles(Role.User)
  async getBottlenecksByRunHistoryId(
    @Req() req: RequestWithUser,
    @Param('runHistoryId') runHistoryId: string,
  ) {
    return this.bottlenecksService.getBottlenecksByRunHistoryId(
      runHistoryId,
      req.user.userId,
    );
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze a specific bottleneck' })
  @ApiResponse({
    status: 200,
    description: 'Returns the analysis results for the specified bottleneck.',
  })
  @ApiResponse({ status: 404, description: 'Bottleneck not found.' })
  @UseGuards(TokenGuard, RolesGuard)
  @Roles(Role.User)
  async analyzeBottlenecks(@Body() body: { bottleneckId: string }) {
    return this.bottlenecksService.analyzeBottlenecks(body.bottleneckId);
  }
}
