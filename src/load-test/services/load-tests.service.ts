import { InfluxDBService } from '@/load-test/services/influxdb.service';
import { K6Service } from '@/load-test/services/k6.service';
import { ActiveTest } from '@/load-test/types/load-test.types';
import { RunHistoryRepository } from '@/run-history/run-history.repository';
import { ScenarioRepository } from '@/scenario/repositories/scenario.repository';
import serverConfig from '@/shared/config';
import { InjectRedis } from '@nestjs-modules/ioredis/dist/redis.decorators';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RunHistory, RunHistoryStatus } from '@prisma/client';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import Redis from 'ioredis';
import * as path from 'path';
import { Observable, Subject } from 'rxjs';

export interface ScenarioStatusUpdate {
  scenarioId: string;
  runHistoryId: string;
  status: RunHistoryStatus;
  type: string;
  id: string;
  retry: number;
}

@Injectable()
export class LoadTestsService {
  private readonly logger = new Logger(LoadTestsService.name);
  private readonly TEMP_DIR = path.join(process.cwd(), 'temp');
  private readonly INFLUXDB_URL = serverConfig.loadTest.INFLUXDB_URL;
  private activeScenarios: Map<string, ActiveTest> = new Map();
  private usersSubjects = new Map<string, Subject<ScenarioStatusUpdate>>();

  constructor(
    private readonly k6Service: K6Service,
    private readonly influxDBService: InfluxDBService,
    private readonly scenarioRepository: ScenarioRepository,
    private readonly runHistoryRepository: RunHistoryRepository,
    @InjectRedis() private readonly redisClient: Redis,
  ) {
    void this.ensureTempDirectory();
  }

  onModuleDestroy() {
    this.activeScenarios.forEach((scenario) => {
      scenario.process.kill();
    });
    this.usersSubjects.forEach((subject) => {
      subject.complete();
    });
    this.usersSubjects.clear();
    this.activeScenarios.clear();
  }

  private async ensureTempDirectory() {
    try {
      await fs.access(this.TEMP_DIR);
    } catch {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
    }
  }

  private async emitStatusUpdate(
    userId: string,
    scenarioId: string,
    runHistoryId: string,
    status: RunHistoryStatus,
    redis: boolean = true,
  ) {
    const event = {
      userId,
      scenarioId,
      runHistoryId,
      status,
      type: 'message',
      id: `${scenarioId}:${runHistoryId}`,
      retry: 3000,
    };

    if (redis) {
      await this.redisClient.publish('load-test.status', JSON.stringify(event));
    }
    const subject = this.usersSubjects.get(userId);
    if (subject) {
      subject.next(event);
    }
  }

  private getRunningScenarios(userId: string) {
    const runningScenarios = Array.from(this.activeScenarios.entries())
      .filter(([key]) => key.endsWith(`:${userId}`))
      .map(([key, value]) => ({
        scenarioId: key.split(':')[0],
        runHistoryId: value.runHistoryId,
      }));
    return runningScenarios;
  }

  getCurrentUserStatus(userId: string): {
    stream: Observable<ScenarioStatusUpdate> | null;
  } {
    const subject = this.usersSubjects.get(userId);
    return {
      stream: subject?.asObservable() || null,
    };
  }

  subscribeToUserStatus(userId: string): Observable<ScenarioStatusUpdate> {
    let subject = this.usersSubjects.get(userId);
    const isNewSubject = !subject;
    if (isNewSubject) {
      subject = new Subject<ScenarioStatusUpdate>();
      this.usersSubjects.set(userId, subject);
    }

    return new Observable<ScenarioStatusUpdate>((observer) => {
      const subscription = subject!.subscribe(observer);
      if (isNewSubject) {
        this.getRunningScenarios(userId).forEach(async (scenario) => {
          await this.emitStatusUpdate(
            userId,
            scenario.scenarioId,
            scenario.runHistoryId,
            RunHistoryStatus.RUNNING,
            false,
          );
        });
      }
      return () => {
        subscription.unsubscribe();
        this.usersSubjects.delete(userId);
      };
    });
  }

  private async updateRunHistoryWithMetrics(
    userId: string,
    runHistoryId: string,
    scenarioId: string,
    status: RunHistoryStatus,
  ): Promise<RunHistory> {
    try {
      // Get metrics from InfluxDB
      const metrics =
        await this.influxDBService.getMetricsFromInfluxDB(scenarioId);

      // Update run history with metrics
      const { successRate, avgResponseTime, errorRate, requestsPerSecond } =
        metrics;
      const updated = await this.runHistoryRepository.update(runHistoryId, {
        status,
        successRate,
        avgResponseTime,
        errorRate,
        requestsPerSecond,
      });

      // Emit completion event with metrics
      this.emitStatusUpdate(userId, scenarioId, runHistoryId, status);

      return updated;
    } catch (error: unknown) {
      this.logger.error(
        `Error updating run history with metrics for scenario ${scenarioId}:`,
        error,
      );
      // Still update status and emit event even if metrics collection fails
      const updated = await this.runHistoryRepository.update(runHistoryId, {
        status,
      });

      // Emit completion event without metrics
      this.emitStatusUpdate(userId, scenarioId, runHistoryId, status);

      return updated;
    }
  }

  async runTest(scenarioId: string, userId: string): Promise<RunHistory> {
    const isRunning = this.activeScenarios.has(`${scenarioId}:${userId}`);
    if (isRunning) {
      const runHistory =
        await this.runHistoryRepository.findRunningRunHistory(scenarioId);

      if (runHistory) {
        return runHistory;
      }

      throw new BadRequestException('Scenario is already running');
    }

    const scenario = await this.scenarioRepository.findOne(scenarioId, userId);
    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }

    const typedScenario = scenario;

    // Create run history record with RUNNING status
    const runHistory = await this.runHistoryRepository.create({
      scenarioId,
      runAt: new Date(),
      vus: typedScenario.vus,
      duration: typedScenario.duration,
      status: RunHistoryStatus.RUNNING,
      successRate: 0,
      avgResponseTime: 0,
      errorRate: 0,
      requestsPerSecond: 0,
    });

    // Emit started event
    this.emitStatusUpdate(
      userId,
      scenarioId,
      runHistory.id,
      RunHistoryStatus.RUNNING,
    );

    try {
      // Generate and write k6 script with scenario ID
      const script = this.k6Service.generateK6Script(typedScenario, scenarioId);
      const scriptPath = path.join(this.TEMP_DIR, `${scenarioId}.js`);
      await fs.writeFile(scriptPath, script);

      // Prepare Docker command for k6
      const dockerArgs = [
        'run',
        '--rm',
        '-v',
        `${this.TEMP_DIR}:/scripts`,
        '-e',
        'K6_INFLUXDB_TAGS_AS_FIELDS=flow_id,step_id,scenario_id',
        '-e',
        'K6_INFLUXDB_TAGS=flow_id,step_id,scenario_id',
        'grafana/k6',
        'run',
        `/scripts/${scenarioId}.js`,
        '--out',
        `influxdb=${this.INFLUXDB_URL}`,
      ];

      // Spawn Docker process
      const dockerProcess = spawn('docker', dockerArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Store process in activeScenarios
      this.activeScenarios.set(`${scenarioId}:${userId}`, {
        process: dockerProcess,
        runHistoryId: runHistory.id,
      });

      // Handle stdout
      dockerProcess.stdout.on('data', async (data: Buffer) => {
        const log = data.toString().trim();
        this.logger.log(`[k6:${scenarioId}] ${log}`);

        const progressMatch = log.match(/\[\s*(\d+)%\s*\]/);
        if (progressMatch) {
          const progressPercent = parseInt(progressMatch[1], 10);
          await this.runHistoryRepository.update(runHistory.id, {
            progress: progressPercent,
          });
        }
      });

      // Handle stderr
      dockerProcess.stderr.on('data', (data: Buffer) => {
        this.logger.error(`[k6:${scenarioId}] ${data.toString().trim()}`);
      });

      // Handle process completion
      dockerProcess.on(
        'close',
        (code: number | null, signal: string | null) => {
          const wasKilled = signal === 'SIGTERM';

          const finalStatus = wasKilled
            ? RunHistoryStatus.ABORTED
            : code === 0
              ? RunHistoryStatus.SUCCESS
              : RunHistoryStatus.FAILED;

          // Use void to handle the Promise
          void (async () => {
            try {
              // Update run history with metrics and status
              await this.updateRunHistoryWithMetrics(
                userId,
                runHistory.id,
                scenarioId,
                finalStatus,
              );
            } catch (error: unknown) {
              this.logger.error(
                `Error in test completion handler for scenario ${scenarioId}:`,
                error,
              );
            }

            // Clean up
            this.activeScenarios.delete(`${scenarioId}:${userId}`);
          })();
        },
      );

      // Return immediately
      return runHistory;
    } catch (error: unknown) {
      this.logger.error(
        `Error starting k6 test for scenario ${scenarioId}:`,
        error,
      );

      await this.runHistoryRepository.update(runHistory.id, {
        status: RunHistoryStatus.FAILED,
      });

      throw error;
    }
  }

  async stopTest(scenarioId: string, userId: string): Promise<RunHistory> {
    const test = this.activeScenarios.get(`${scenarioId}:${userId}`);

    if (!test) {
      const runHistories =
        await this.runHistoryRepository.findRunningRunHistories(scenarioId);

      if (runHistories.length === 0) {
        this.logger.warn(
          `No active test or running scenario found for ${scenarioId}`,
        );
        throw new NotFoundException('Scenario is not running');
      }

      const updatedHistories = await Promise.all(
        runHistories.map(async (run) => {
          return await this.runHistoryRepository.update(run.id, {
            status: RunHistoryStatus.ABORTED,
          });
        }),
      );

      return updatedHistories[0];
    }

    try {
      // Kill the Docker process
      test.process.kill();

      // Update run history with metrics and ABORTED status
      const updated = await this.updateRunHistoryWithMetrics(
        userId,
        test.runHistoryId,
        scenarioId,
        RunHistoryStatus.ABORTED,
      );

      // Clean up
      this.activeScenarios.delete(`${scenarioId}:${userId}`);

      return updated;
    } catch (error: unknown) {
      this.logger.error(
        `Error stopping k6 test for scenario ${scenarioId}:`,
        error,
      );
      throw error;
    }
  }
}
