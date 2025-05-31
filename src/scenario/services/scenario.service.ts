import { CreateScenarioDto } from '@/scenario/dtos/scenario.dto';
import { ScenarioRepository } from '@/scenario/repositories/scenario.repository';
import { Injectable } from '@nestjs/common';
import { Prisma, RunHistory, Scenario } from '@prisma/client';

export class UpdateScenarioDto extends CreateScenarioDto {}

@Injectable()
export class ScenarioService {
  constructor(private readonly scenarioRepository: ScenarioRepository) {}

  async findAll(userId: string): Promise<Scenario[]> {
    return this.scenarioRepository.findAll(userId);
  }

  async findOne(id: string, userId: string): Promise<Scenario> {
    return this.scenarioRepository.findOne(id, userId);
  }

  async findAllByGroupId(groupId: string, userId: string): Promise<Scenario[]> {
    return this.scenarioRepository.findAllByGroupId(groupId, userId);
  }

  async create(
    createScenarioDto: CreateScenarioDto,
    userId: string,
  ): Promise<Scenario> {
    const { groupId, flows, ...scenarioData } = createScenarioDto;

    const createInput: Prisma.ScenarioCreateInput = {
      ...scenarioData,
      user: { connect: { id: userId } },
      group: groupId ? { connect: { id: groupId } } : undefined,
      flows: {
        create: flows.map((flow, index) => ({
          ...flow,
          order: flow.order ?? index,
          steps: {
            create: flow.steps.map((step, stepIndex) => ({
              ...step,
              order: step.order ?? stepIndex,
              config: step.config as Prisma.InputJsonValue,
            })),
          },
        })),
      },
    };

    return this.scenarioRepository.create(createInput);
  }

  async update(
    id: string,
    updateScenarioDto: UpdateScenarioDto,
    userId: string,
  ): Promise<Scenario> {
    const { flows, ...scenarioData } = updateScenarioDto;

    await Promise.all([
      this.findOne(id, userId),
      this.scenarioRepository.updateMetadata(id, scenarioData),
      this.scenarioRepository.syncFlows(id, flows),
    ]);

    return this.scenarioRepository.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<Scenario> {
    return this.scenarioRepository.remove(id, userId);
  }

  async getTestHistory(id: string, userId: string): Promise<RunHistory[]> {
    await this.scenarioRepository.findOne(id, userId); // Verify ownership
    return this.scenarioRepository.getTestHistory(id);
  }
}
