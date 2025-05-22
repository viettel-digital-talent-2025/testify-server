import { Injectable } from '@nestjs/common';
import { ScenarioGroupRepository } from '../repositories/scenario-group.repository';
import {
  CreateScenarioGroupDto,
  ScenarioGroupDto,
} from '../dtos/scenario-group.dto';

@Injectable()
export class ScenarioGroupService {
  constructor(
    private readonly scenarioGroupRepository: ScenarioGroupRepository,
  ) {}

  async findAll(userId: string): Promise<ScenarioGroupDto[]> {
    return this.scenarioGroupRepository.findAll(userId);
  }

  async create(userId: string, data: CreateScenarioGroupDto) {
    return this.scenarioGroupRepository.create(userId, data);
  }

  async update(id: string, data: Partial<CreateScenarioGroupDto>) {
    return this.scenarioGroupRepository.update(id, data);
  }

  async delete(id: string) {
    return this.scenarioGroupRepository.delete(id);
  }
}
