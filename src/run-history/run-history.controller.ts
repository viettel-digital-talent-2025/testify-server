import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
} from '@nestjs/common';
import { RunHistoryService } from './run-history.service';
import {
  RunHistoryCreateInput,
  RunHistoryUpdateInput,
  RunHistoryWithMetrics,
} from './run-history.model';

@Controller('run-history')
export class RunHistoryController {
  constructor(private readonly service: RunHistoryService) {}

  @Post()
  async create(
    @Body() data: RunHistoryCreateInput,
  ): Promise<RunHistoryWithMetrics> {
    return this.service.create(data);
  }

  @Get(':id')
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

  @Get()
  async findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('orderBy', new DefaultValuePipe('createdAt')) orderBy: string,
    @Query('order', new DefaultValuePipe('desc')) order: 'asc' | 'desc',
    @Query('scenarioId') scenarioId?: string,
  ): Promise<{ data: RunHistoryWithMetrics[]; total: number }> {
    const params = {
      skip,
      take,
      orderBy: { [orderBy]: order },
    };

    if (scenarioId) {
      return this.service.findByScenarioId(scenarioId, params);
    }

    return this.service.findAll(params);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: RunHistoryUpdateInput,
  ): Promise<RunHistoryWithMetrics> {
    try {
      return await this.service.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Run history not found with id: ${id}`);
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<RunHistoryWithMetrics> {
    try {
      return await this.service.delete({ id });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Run history not found with id: ${id}`);
    }
  }

  @Get('scenario/:scenarioId')
  async findByScenarioId(
    @Param('scenarioId') scenarioId: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('orderBy', new DefaultValuePipe('createdAt')) orderBy: string,
    @Query('order', new DefaultValuePipe('desc')) order: 'asc' | 'desc',
  ): Promise<{ data: RunHistoryWithMetrics[]; total: number }> {
    return this.service.findByScenarioId(scenarioId, {
      skip,
      take,
      orderBy: { [orderBy]: order },
    });
  }
}
