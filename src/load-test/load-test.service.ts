import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { spawn } from 'child_process';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RunHistory, RunHistoryStatus } from '@prisma/client';
import { PrismaService } from '../shared/services/prisma.service';
import {
  ScenarioWithEndpoints,
  ActiveTest,
  LoadTestCompletedEvent,
  Endpoint,
  ScenarioWithFlowsAndSteps,
} from './types/load-test.types';
import { InfluxDBService } from './influxdb.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class LoadTestService {
  private readonly logger = new Logger(LoadTestService.name);
  private activeTests: Map<string, ActiveTest> = new Map();
  private readonly TEMP_DIR = path.join(process.cwd(), 'temp');
  private readonly INFLUXDB_URL = 'http://host.docker.internal:8086/k6';

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly influxDBService: InfluxDBService,
  ) {
    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  private async ensureTempDirectory() {
    try {
      await fs.access(this.TEMP_DIR);
    } catch {
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
    }
  }

  generateK6Script(
    scenario: ScenarioWithEndpoints,
    scenarioId: string,
  ): string {
    const script = `
      import http from 'k6/http';
      import { check, sleep } from 'k6';
      import { Rate, Trend } from 'k6/metrics';
      
      const errorRate = new Rate('errors');
      const requestDuration = new Trend('request_duration');
      
      export const options = {
        vus: ${scenario.vus},
        duration: '${scenario.duration}s',
        tags: {
          scenario_id: "${scenarioId}",
          scenario_name: "${scenario.name}",
          test_type: "${scenario.type}"
        },
        thresholds: {
          'errors': ['rate<0.1'],
          'request_duration': ['p(95)<500']
        }
      };
      
      export default function() {
        ${scenario.endpoints
          .map(
            (endpoint) => `
          // ${endpoint.name}
          const ${endpoint.name.toLowerCase().replace(/\s+/g, '_')}Response = http.${endpoint.method.toLowerCase()}(
            '${endpoint.endpoint}',
            ${endpoint.body ? JSON.stringify(endpoint.body) : 'null'},
            { 
              headers: ${JSON.stringify(endpoint.headers || {})},
              tags: {
                endpoint_name: "${endpoint.name}",
                endpoint_id: "${endpoint.id}"
              }
            }
          );
          
          check(${endpoint.name.toLowerCase().replace(/\s+/g, '_')}Response, {
            '${endpoint.name} status is 2xx': (r) => r.status >= 200 && r.status < 300,
          });
          
          errorRate.add(${endpoint.name.toLowerCase().replace(/\s+/g, '_')}Response.status >= 400);
          requestDuration.add(${endpoint.name.toLowerCase().replace(/\s+/g, '_')}Response.timings.duration);
          
          sleep(1);
        `,
          )
          .join('\n')}
      }
    `;

    return script;
  }

  private async updateRunHistoryWithMetrics(
    runHistoryId: string,
    scenarioId: string,
    status: RunHistoryStatus,
  ): Promise<void> {
    try {
      // Get metrics from InfluxDB
      const metrics =
        await this.influxDBService.getMetricsFromInfluxDB(scenarioId);

      // Update run history with metrics
      await this.prisma.runHistory.update({
        where: { id: runHistoryId },
        data: {
          status,
          avgResponseTime: metrics.avgResponseTime,
          errorRate: metrics.errorRate,
          successRate: metrics.successRate,
          requestsPerSecond: metrics.requestsPerSecond,
        },
      });

      this.logger.log(
        `Updated run history ${runHistoryId} with metrics:`,
        metrics,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Error updating run history with metrics for scenario ${scenarioId}:`,
        error,
      );
      // Still update status even if metrics collection fails
      await this.prisma.runHistory.update({
        where: { id: runHistoryId },
        data: { status },
      });
    }
  }

  async runTest(scenarioId: string): Promise<RunHistory> {
    const scenario = await this.prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: {
        Flows: {
          include: {
            steps: {
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }

    const typedScenario = scenario as unknown as ScenarioWithFlowsAndSteps;

    // Transform flow steps into endpoints for k6 script
    const endpoints: Endpoint[] = typedScenario.Flows.reduce<Endpoint[]>(
      (acc, flow) => {
        const flowEndpoints = flow.steps.map((step) => ({
          id: step.id,
          name: step.name,
          method: step.config.method || 'GET',
          endpoint: step.config.url || '',
          body: step.config.body || {},
          headers: step.config.headers || {},
        }));
        return [...acc, ...flowEndpoints];
      },
      [],
    );

    const scenarioWithEndpoints: ScenarioWithEndpoints = {
      ...typedScenario,
      endpoints,
    };

    // Create run history record with RUNNING status
    const runHistory = await this.prisma.runHistory.create({
      data: {
        scenarioId,
        runAt: new Date(),
        vus: typedScenario.vus,
        duration: typedScenario.duration,
        status: RunHistoryStatus.RUNNING,
        successRate: 0,
        avgResponseTime: 0,
        errorRate: 0,
        requestsPerSecond: 0,
      },
    });

    try {
      // Generate and write k6 script with scenario ID
      const script = this.generateK6Script(scenarioWithEndpoints, scenarioId);
      const scriptPath = path.join(this.TEMP_DIR, `${scenarioId}.js`);
      await fs.writeFile(scriptPath, script);

      // Prepare Docker command for k6
      const dockerArgs = [
        'run',
        '--rm',
        '-v',
        `${this.TEMP_DIR}:/scripts`,
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

      // Store process in activeTests
      this.activeTests.set(scenarioId, {
        process: dockerProcess,
        runHistoryId: runHistory.id,
      });

      // Handle stdout
      dockerProcess.stdout.on('data', (data: Buffer) => {
        this.logger.log(`[k6:${scenarioId}] ${data.toString().trim()}`);
      });

      // Handle stderr
      dockerProcess.stderr.on('data', (data: Buffer) => {
        this.logger.error(`[k6:${scenarioId}] ${data.toString().trim()}`);
      });

      // Handle process completion
      dockerProcess.on('close', (code: number | null) => {
        const finalStatus =
          code === 0 ? RunHistoryStatus.SUCCESS : RunHistoryStatus.FAILED;

        // Use void to handle the Promise
        void (async () => {
          try {
            // Update run history with metrics and status
            await this.updateRunHistoryWithMetrics(
              runHistory.id,
              scenarioId,
              finalStatus,
            );

            this.eventEmitter.emit('load-test.completed', {
              scenarioId,
              runHistoryId: runHistory.id,
              status: finalStatus,
            } as LoadTestCompletedEvent);
          } catch (error: unknown) {
            this.logger.error(
              `Error in test completion handler for scenario ${scenarioId}:`,
              error,
            );
          }

          // Clean up
          this.activeTests.delete(scenarioId);
        })();
      });

      // Return immediately
      return runHistory;
    } catch (error: unknown) {
      this.logger.error(
        `Error starting k6 test for scenario ${scenarioId}:`,
        error,
      );

      await this.prisma.runHistory.update({
        where: { id: runHistory.id },
        data: { status: RunHistoryStatus.FAILED },
      });

      throw error;
    }
  }

  async stopTest(scenarioId: string): Promise<void> {
    const test = this.activeTests.get(scenarioId);
    if (test) {
      try {
        // Kill the Docker process
        test.process.kill();

        // Update run history with metrics and ABORTED status
        await this.updateRunHistoryWithMetrics(
          test.runHistoryId,
          scenarioId,
          RunHistoryStatus.ABORTED,
        );

        // Clean up
        this.activeTests.delete(scenarioId);

        this.logger.log(
          `Successfully stopped k6 test for scenario ${scenarioId}`,
        );
      } catch (error: unknown) {
        this.logger.error(
          `Error stopping k6 test for scenario ${scenarioId}:`,
          error,
        );
        throw error;
      }
    } else {
      this.logger.warn(`No active test found for scenario ${scenarioId}`);
    }
  }
}
