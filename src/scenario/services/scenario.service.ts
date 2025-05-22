import { Injectable } from '@nestjs/common';
import { ScenarioRepository } from '../repositories/scenario.repository';
import { CreateScenarioDto } from '../dtos/scenario.dto';
import { Scenario, RunHistory, Prisma } from '@prisma/client';

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
      Flows: {
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

    return this.scenarioRepository.update(
      id,
      {
        ...scenarioData,
        Flows: {
          deleteMany: {},
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
      },
      userId,
    );
  }

  async remove(id: string, userId: string): Promise<Scenario> {
    return this.scenarioRepository.remove(id, userId);
  }

  async getTestHistory(id: string, userId: string): Promise<RunHistory[]> {
    await this.scenarioRepository.findOne(id, userId); // Verify ownership
    return this.scenarioRepository.getTestHistory(id);
  }
}
