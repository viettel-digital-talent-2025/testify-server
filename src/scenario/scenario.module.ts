import { Module } from '@nestjs/common';
import { LoadTestModule } from '../load-test/load-test.module';
import { ScenarioController } from './controllers/scenario.controller';
import { ScenarioGroupController } from './controllers/scenario-group.controller';
import { ScenarioService } from './services/scenario.service';
import { ScenarioGroupService } from './services/scenario-group.service';
import { ScenarioRepository } from './repositories/scenario.repository';
import { ScenarioGroupRepository } from './repositories/scenario-group.repository';
import { PrismaService } from '../shared/services/prisma.service';

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
