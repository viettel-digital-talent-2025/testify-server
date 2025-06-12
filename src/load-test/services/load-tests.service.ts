import { K6Service } from '@/load-test/services/k6.service';
import { MetricsService } from '@/load-test/services/metrics.service';
import {
  EmitStatusUpdateProps,
  LoadTestStatusEvent,
} from '@/load-test/types/load-test.types';
import { RunHistoryMetricsRepository } from '@/run-history/repositories/run-history-metrics.repository';
import { RunHistoryRepository } from '@/run-history/repositories/run-history.repository';
import { ScenarioRepository } from '@/scenario/repositories/scenario.repository';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import { SSEEvent } from '@/shared/types/sse.types';
import { InjectRedis } from '@nestjs-modules/ioredis/dist/redis.decorators';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { RunHistory, RunHistoryStatus } from '@prisma/client';
import Redis from 'ioredis';
import { Observable, Subject } from 'rxjs';
import { K8sService } from './k8s.service';

@Injectable()
export class LoadTestsService implements OnModuleDestroy {
  private usersSubjects = new Map<
    string,
    {
      subject: Subject<SSEEvent<LoadTestStatusEvent>>;
      pingInterval: NodeJS.Timeout;
    }
  >();

  constructor(
    private readonly logger: AppLoggerService,
    private readonly k6Service: K6Service,
    private readonly k8sService: K8sService,
    private readonly metricsService: MetricsService,
    private readonly scenarioRepository: ScenarioRepository,
    private readonly runHistoryRepository: RunHistoryRepository,
    private readonly runHistoryMetricsRepository: RunHistoryMetricsRepository,
    @InjectRedis() private readonly redisClient: Redis,
  ) {
    this.logger.setContext(LoadTestsService.name);
  }

  onModuleDestroy() {
    this.usersSubjects.forEach(({ subject, pingInterval }) => {
      subject.complete();
      clearInterval(pingInterval);
    });
    this.usersSubjects.clear();
  }

  // emit status update to client
  private async emitStatusUpdate({
    redis = true,
    ...props
  }: EmitStatusUpdateProps) {
    const event: SSEEvent<LoadTestStatusEvent> = {
      data: props,
      event: 'message',
      id: `${props.runHistoryId}:${props.scenarioId}`,
      retry: 3000,
    };

    if (redis) {
      const message = JSON.stringify(props);
      await this.redisClient.publish('load-test.status', message);
    }

    const subject = this.usersSubjects.get(props.userId);
    if (subject) {
      subject.subject.next(event);
    }
  }

  // get current user status that sse connection is open or not
  getCurrentUserStatus({ userId }: { userId: string }): {
    stream: Observable<SSEEvent<LoadTestStatusEvent>> | null;
  } {
    return {
      stream: this.usersSubjects.get(userId)?.subject.asObservable() || null,
    };
  }

  //  create a new sse connection for a user if not exists
  async subscribeToUserStatus({
    userId,
  }: {
    userId: string;
  }): Promise<Observable<SSEEvent<LoadTestStatusEvent>>> {
    let subject = this.usersSubjects.get(userId)?.subject;
    const isNewSubject = !subject;

    if (isNewSubject) {
      subject = new Subject<SSEEvent<LoadTestStatusEvent>>();

      const pingInterval = setInterval(() => {
        subject!.next({
          data: undefined,
          event: 'ping',
          id: `ping:${userId}`,
          retry: 3000,
        });
      }, 15000);

      this.usersSubjects.set(userId, {
        subject,
        pingInterval,
      });

      const runningJobs =
        await this.runHistoryRepository.findRunningJobsByUserId({
          userId,
        });

      await Promise.all(
        runningJobs.map((job) =>
          this.emitStatusUpdate({
            userId,
            runHistoryId: job.id,
            scenarioId: job.scenarioId,
            status: job.status,
            runAt: job.runAt!,
            redis: false,
          }),
        ),
      );
    }

    return new Observable<SSEEvent<LoadTestStatusEvent>>((observer) => {
      const subscription = subject!.subscribe(observer);

      return () => {
        subscription.unsubscribe();
        this.usersSubjects.delete(userId);
      };
    });
  }

  private async updateRunHistoryWithMetrics({
    runHistoryId,
    scenarioId,
    userId,
    status,
  }: {
    runHistoryId: string;
    scenarioId: string;
    userId: string;
    status: RunHistoryStatus;
  }): Promise<RunHistory> {
    const runHistory = await this.runHistoryRepository.findUnique(runHistoryId);
    if (!runHistory) throw new NotFoundException('Run history not found');

    const { flows } = runHistory.scenario;
    const { runAt, endAt } = runHistory;

    if (!runAt || !endAt) {
      this.logger.error('Failed to calculate interval');
      throw new InternalServerErrorException('Failed to calculate interval');
    }

    const interval = (endAt.getTime() - runAt.getTime()) / 1000;
    const runAtString = runAt.toISOString();
    const endAtString = endAt.toISOString();

    try {
      const metricsPromises = [
        ...flows.flatMap((flow) =>
          flow.steps.map(async (step) => {
            const { metrics } = await this.metricsService.getMetrics({
              runHistoryId,
              scenarioId,
              userId,
              runAt: runAtString,
              endAt: endAtString,
              tags: { flow_id: flow.id, step_id: step.id },
            });

            return this.runHistoryMetricsRepository.create({
              runHistoryId,
              flowId: flow.id,
              stepId: step.id,
              p95Latency: metrics.latency[0].p95,
              avgLatency: metrics.latency[0].avg,
              throughput: (metrics.throughput[0].value ?? 0) / interval,
              errorRate: metrics.errorRate[0].value,
            });
          }),
        ),
        (async () => {
          const { metrics } = await this.metricsService.getMetrics({
            runHistoryId,
            scenarioId,
            userId,
            runAt: runAtString,
            endAt: endAtString,
          });

          return this.runHistoryRepository.update(runHistoryId, {
            status,
            p95Latency: metrics.latency[0].p95,
            avgLatency: metrics.latency[0].avg,
            throughput: (metrics.throughput[0].value ?? 0) / interval,
            errorRate: metrics.errorRate[0].value,
          });
        })(),
      ];

      const results = await Promise.all(metricsPromises);
      return results[results.length - 1] as RunHistory;
    } catch (error) {
      this.logger.error(
        `Error updating run history with metrics for scenario ${scenarioId}:`,
        error,
      );
      throw new InternalServerErrorException(
        `Error updating run history with metrics for scenario ${scenarioId}`,
      );
    }
  }

  // run a new test
  async runTest({
    scenarioId,
    userId,
  }: {
    scenarioId: string;
    userId: string;
  }): Promise<RunHistory> {
    const runHistories =
      await this.runHistoryRepository.findRunningJobsByScenarioId({
        scenarioId,
      });
    let runHistory: RunHistory | null = null;

    if (runHistories.length > 0) {
      const isExistingJob = await this.k8sService.isExistingJob(
        runHistories[0].id,
      );

      if (isExistingJob) {
        return runHistories[0];
      }

      runHistory = runHistories[0];
    }

    const scenario = await this.scenarioRepository.findOne({
      id: scenarioId,
      userId,
    });
    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }

    // create run history
    let runAt: Date;
    if (!runHistory) {
      runHistory = await this.runHistoryRepository.create({
        scenarioId,
        userId,
        status: RunHistoryStatus.RUNNING,
      });
    }

    try {
      // Generate and write k6 script with scenario ID
      const script = this.k6Service.generateK6Script({
        scenario,
        runHistoryId: runHistory.id,
      });

      // create k6 job
      await this.k8sService.createK6Job({
        runHistoryId: runHistory.id,
        scenarioId,
        userId,
        script,
      });

      // get run at from influxdb
      runAt = await this.metricsService.getRunAt(runHistory.id);
      await this.runHistoryRepository.update(runHistory.id, { runAt });

      // emit started event to client
      setImmediate(() => {
        void this.emitStatusUpdate({
          runHistoryId: runHistory.id,
          scenarioId,
          userId,
          status: RunHistoryStatus.RUNNING,
          runAt,
        });
      });

      // stream k6 logs
      setImmediate(async () => {
        const stream = await this.k8sService.streamK6Logs(
          runHistory.id,
          async (log) => {
            const progressMatch = log.match(/\[\s*(\d+)%\s*\]/);
            if (progressMatch) {
              const progress = parseInt(progressMatch[1], 10);
              await this.runHistoryRepository.update(runHistory.id, {
                progress,
              });
              if (stream && progress === 100) {
                stream.destroy();
              }
            }
          },
        );
      });

      // watch job completion
      setImmediate(() => {
        void this.k8sService.watchJobCompletion(
          runHistory.id,
          async (status) => {
            // update run history with status and end at
            const endAt = await this.metricsService.getEndAt(runHistory.id);
            await this.runHistoryRepository.update(runHistory.id, {
              status,
              endAt,
            });

            // update run history with metrics
            await this.updateRunHistoryWithMetrics({
              runHistoryId: runHistory.id,
              scenarioId,
              userId,
              status,
            });

            // emit status update to client
            await this.emitStatusUpdate({
              runHistoryId: runHistory.id,
              scenarioId,
              userId,
              status,
              runAt,
            });
          },
        );
      });

      return {
        ...runHistory,
        runAt,
      };
    } catch (error: unknown) {
      const status = RunHistoryStatus.FAILED;

      // delete k6 job
      await this.k8sService.cleanUpK6Job(runHistory.id);

      // get run at and end at
      const [runAt, endAt] = await Promise.all([
        this.metricsService.getRunAt(runHistory.id),
        this.metricsService.getEndAt(runHistory.id),
      ]);

      // update run history with status and end at
      await this.runHistoryRepository.update(runHistory.id, {
        status,
        runAt,
        endAt,
      });

      setImmediate(() => {
        void this.emitStatusUpdate({
          runHistoryId: runHistory.id,
          scenarioId,
          userId,
          status,
          runAt,
        });
      });

      this.logger.error(
        `Error starting k6 test for scenario ${scenarioId}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new InternalServerErrorException(
        `Error starting k6 test for scenario ${scenarioId}`,
      );
    }
  }

  async stopTest({
    scenarioId,
    userId,
  }: {
    scenarioId: string;
    userId: string;
  }): Promise<RunHistory> {
    const runHistories =
      await this.runHistoryRepository.findRunningJobsByScenarioId({
        scenarioId,
      });

    if (!runHistories) {
      throw new NotFoundException('Run history not found');
    }

    try {
      const status = RunHistoryStatus.ABORTED;

      await Promise.all(
        runHistories.map(async (runHistory) => {
          const [_, endAt] = await Promise.all([
            this.k8sService.cleanUpK6Job(runHistory.id),
            this.metricsService.getEndAt(runHistory.id),
          ]);

          await this.runHistoryRepository.update(runHistory.id, {
            status,
            endAt,
          });

          await this.emitStatusUpdate({
            runHistoryId: runHistory.id,
            scenarioId,
            userId,
            status,
            runAt: runHistory.runAt!,
          });
        }),
      );

      return runHistories[0];
    } catch (error) {
      this.logger.error(
        `Error stopping k6 test for run history ${scenarioId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new InternalServerErrorException(
        `Error stopping k6 test for run history ${scenarioId}`,
      );
    }
  }
}
