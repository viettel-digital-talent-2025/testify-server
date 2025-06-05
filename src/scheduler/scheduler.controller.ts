import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { TokenGuard } from '@/auth/guards/token.guard';
import {
  CreateSchedulerDto,
  UpdateSchedulerDto,
} from '@/scheduler/scheduler.dto';
import { SchedulerService } from '@/scheduler/scheduler.service';
import { RequestWithUser } from '@/shared/types/request.types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

@ApiTags('api/v1/scheduler')
@Controller('api/v1/scheduler')
@UseGuards(TokenGuard, RolesGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all schedulers for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all schedulers for the current user.',
    type: [CreateSchedulerDto],
  })
  @Roles(Role.User)
  async findAll(@Request() req: RequestWithUser) {
    const schedulers = await this.schedulerService.findAll(req.user.userId);
    return {
      message: 'Schedulers fetched successfully',
      schedulers,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new scheduler' })
  @ApiResponse({
    status: 201,
    description: 'The scheduler has been successfully created.',
    type: CreateSchedulerDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 404, description: 'Scenario not found.' })
  @Roles(Role.User)
  async create(
    @Body() createSchedulerDto: CreateSchedulerDto,
    @Request() req: RequestWithUser,
  ) {
    const scheduler = await this.schedulerService.create(
      createSchedulerDto,
      req.user.userId,
    );
    return {
      message: 'Scheduler created successfully',
      scheduler,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a scheduler' })
  @ApiResponse({
    status: 200,
    description: 'The scheduler has been successfully updated.',
    type: UpdateSchedulerDto,
  })
  @ApiResponse({ status: 404, description: 'Scheduler not found.' })
  @Roles(Role.User)
  async update(
    @Param('id') id: string,
    @Body() updateSchedulerDto: UpdateSchedulerDto,
    @Request() req: RequestWithUser,
  ) {
    const scheduler = await this.schedulerService.update(
      id,
      updateSchedulerDto,
      req.user.userId,
    );
    return {
      message: 'Scheduler updated successfully',
      scheduler,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a scheduler' })
  @ApiResponse({
    status: 200,
    description: 'The scheduler has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Scheduler not found.' })
  @Roles(Role.User)
  async delete(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.schedulerService.delete(id, req.user.userId);
    return {
      message: 'Scheduler deleted successfully',
    };
  }
}
