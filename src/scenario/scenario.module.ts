import { LoadTestModule } from '@/load-test/load-test.module';
import { ScenarioGroupController } from '@/scenario/controllers/scenario-group.controller';
import { ScenarioController } from '@/scenario/controllers/scenario.controller';
import { ScenarioGroupRepository } from '@/scenario/repositories/scenario-group.repository';
import { ScenarioRepository } from '@/scenario/repositories/scenario.repository';
import { ScenarioGroupService } from '@/scenario/services/scenario-group.service';
import { ScenarioService } from '@/scenario/services/scenario.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [LoadTestModule],
  controllers: [ScenarioController, ScenarioGroupController],
  providers: [
    ScenarioService,
    ScenarioRepository,
    ScenarioGroupService,
    ScenarioGroupRepository,
    PrismaService,
  ],
  exports: [ScenarioService],
})
export class ScenarioModule {}
