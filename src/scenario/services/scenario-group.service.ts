import { CreateScenarioGroupDto } from '@/scenario/dtos/scenario-group.dto';
import { ScenarioGroupRepository } from '@/scenario/repositories/scenario-group.repository';
import { ScenarioRepository } from '@/scenario/repositories/scenario.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ScenarioGroupService {
  constructor(
    private readonly scenarioRepository: ScenarioRepository,
    private readonly scenarioGroupRepository: ScenarioGroupRepository,
  ) {}

  async findAll(userId: string) {
    const scenarioGroups = await this.scenarioGroupRepository.findAll(userId);
    const scenarios = await this.scenarioRepository.findAllByGroupId(
      'null',
      userId,
    );
    return {
      scenarioGroups,
      scenarios,
    };
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
