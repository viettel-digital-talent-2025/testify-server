import { CreateScenarioDto } from '@/scenario/dtos/scenario.dto';
import { ScenarioRepository } from '@/scenario/repositories/scenario.repository';
import { Injectable } from '@nestjs/common';
import { Prisma, RunHistory, Scenario } from '@prisma/client';

export class UpdateScenarioDto extends CreateScenarioDto {}

@Injectable()
export class ScenarioService {
  constructor(private readonly scenarioRepository: ScenarioRepository) {}

  async findAll({ userId }: { userId: string }): Promise<Scenario[]> {
    return this.scenarioRepository.findAll({ userId });
  }

  async findOne({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<Scenario> {
    return this.scenarioRepository.findOne({ id, userId });
  }

  async findAllByGroupId({
    groupId,
    userId,
  }: {
    groupId: string;
    userId: string;
  }): Promise<Scenario[]> {
    return this.scenarioRepository.findAllByGroupId({ groupId, userId });
  }

  async getCount({ userId }: { userId: string }): Promise<Record<string, number>> {
    return this.scenarioRepository.getCount({ userId });
  }

  async create({
    userId,
    data,
  }: {
    userId: string;
    data: CreateScenarioDto;
  }): Promise<Scenario> {
    const { groupId, flows, ...scenarioData } = data;

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

  async update({
    id,
    data,
    userId,
  }: {
    id: string;
    data: UpdateScenarioDto;
    userId: string;
  }): Promise<Scenario> {
    const { flows, ...scenarioData } = data;

    await Promise.all([
      this.findOne({ id, userId }),
      this.scenarioRepository.updateMetadata({ id, data: scenarioData }),
      this.scenarioRepository.syncFlows({ scenarioId: id, flows }),
    ]);

    return this.scenarioRepository.findOne({ id, userId });
  }

  async remove({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<Scenario> {
    return this.scenarioRepository.remove({ id, userId });
  }

  async getTestHistory({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<RunHistory[]> {
    await this.scenarioRepository.findOne({ id, userId }); // Verify ownership
    return this.scenarioRepository.getTestHistory({ id });
  }
}
