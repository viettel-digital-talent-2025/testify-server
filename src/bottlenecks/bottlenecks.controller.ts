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
import { Role } from '@prisma/client';
import { Observable } from 'rxjs';
import { SseEvent } from './bottlenecks.dto';
import { BottlenecksService } from './bottlenecks.service';

@Controller('api/v1/bottlenecks')
export class BottlenecksController {
  constructor(private readonly bottlenecksService: BottlenecksService) {}

  @Sse('alerts/:userId')
  alerts(@Param('userId') userId: string): Observable<SseEvent> {
    return this.bottlenecksService.subscribeToUserAlerts(userId);
  }

  @Get('run-history')
  @UseGuards(TokenGuard, RolesGuard)
  @Roles(Role.User)
  async getBottlenecksRunHistory(@Req() req: RequestWithUser) {
    return this.bottlenecksService.getBottlenecksRunHistory(req.user.userId);
  }

  @Get('run-history/:runHistoryId')
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
  @UseGuards(TokenGuard, RolesGuard)
  @Roles(Role.User)
  async analyzeBottlenecks(@Body() body: { bottleneckId: string }) {
    return this.bottlenecksService.analyzeBottlenecks(body.bottleneckId);
  }
}
