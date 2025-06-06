import { CreateK6Job, K8sJob } from '@/load-test/types/k8s.types';
import serverConfig from '@/shared/config';
import { AppLoggerService } from '@/shared/services/app-logger.service';
import * as k8s from '@kubernetes/client-node';
import { Watch } from '@kubernetes/client-node';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { RunHistoryStatus } from '@prisma/client';
import { PassThrough } from 'stream';

@Injectable()
export class K8sService {
  private readonly INFLUXDB_URL = serverConfig.loadTest.INFLUXDB_URL;
  private readonly namespace = serverConfig.k8s.NAMESPACE;
  private readonly batchApi: k8s.BatchV1Api;
  private readonly coreApi: k8s.CoreV1Api;
  private readonly kc: k8s.KubeConfig;

  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext(K8sService.name);
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.batchApi = this.kc.makeApiClient(k8s.BatchV1Api);
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  async createK6Job(dto: CreateK6Job): Promise<void> {
    const { runHistoryId, scenarioId, userId, script } = dto;

    await this.coreApi.createNamespacedConfigMap({
      namespace: this.namespace,
      body: {
        metadata: { name: `k6-script-${runHistoryId}` },
        data: { [`${runHistoryId}.js`]: script },
      },
    });

    await this.batchApi.createNamespacedJob({
      namespace: this.namespace,
      body: {
        metadata: {
          name: `k6-load-test-${runHistoryId}`,
          labels: {
            'run-history-id': runHistoryId,
            'scenario-id': scenarioId,
            'user-id': userId,
          },
        },
        spec: {
          ttlSecondsAfterFinished: 10,
          template: {
            metadata: {
              name: `k6-load-test-${runHistoryId}`,
              labels: {
                'run-history-id': runHistoryId,
                'scenario-id': scenarioId,
                'user-id': userId,
              },
            },
            spec: {
              restartPolicy: 'Never',
              containers: [
                {
                  name: 'k6',
                  image: 'grafana/k6',
                  args: [
                    'run',
                    `/scripts/${runHistoryId}.js`,
                    '--out',
                    `influxdb=${this.INFLUXDB_URL}`,
                  ],
                  env: [
                    {
                      name: 'K6_INFLUXDB_TAGS_AS_FIELDS',
                      value: 'run_history_id,scenario_id,flow_id,step_id',
                    },
                    // {
                    //   name: 'K6_INFLUXDB_TAGS',
                    //   value: 'run_history_id,scenario_id,flow_id,step_id',
                    // },
                  ],
                  volumeMounts: [{ name: 'k6-scripts', mountPath: '/scripts' }],
                },
              ],
              volumes: [
                {
                  name: 'k6-scripts',
                  configMap: { name: `k6-script-${runHistoryId}` },
                },
              ],
            },
          },
        },
      },
    });
  }

  async cleanUpK6Job(runHistoryId: string): Promise<void> {
    const jobName = `k6-load-test-${runHistoryId}`;
    const configMapName = `k6-script-${runHistoryId}`;

    const deletePod = async () => {
      const labelSelector = `job-name=${jobName}`;
      const podList = await this.coreApi.listNamespacedPod({
        namespace: this.namespace,
        labelSelector,
      });
      return Promise.allSettled(
        podList.items.map((pod) =>
          this.coreApi.deleteNamespacedPod({
            name: pod.metadata!.name!,
            namespace: this.namespace,
          }),
        ),
      );
    };

    const results = await Promise.allSettled([
      this.batchApi.deleteNamespacedJob({
        name: jobName,
        namespace: this.namespace,
      }),
      deletePod(),
      this.coreApi.deleteNamespacedConfigMap({
        name: configMapName,
        namespace: this.namespace,
      }),
    ]);

    results.flat().forEach((result, index) => {
      if (result.status === 'rejected') {
        const resourceType = ['Job', 'Pod', 'ConfigMap'][index];
        const reason =
          result.reason?.body || result.reason?.message || result.reason;

        if (result.reason?.code === 404 || result.reason?.statusCode === 404) {
          this.logger.warn(`${resourceType} not found, skipping cleanup`);
        } else {
          this.logger.error(`Failed to delete ${resourceType}:`, reason);
        }
      }
    });
  }

  async streamK6Logs(runHistoryId: string, onLog: (log: string) => void) {
    const jobName = `k6-load-test-${runHistoryId}`;
    const labelSelector = `job-name=${jobName}`;
    let retries = 30;
    let podName: string | undefined;
    let podReady = false;

    while (retries > 0) {
      try {
        const podList = await this.coreApi.listNamespacedPod({
          namespace: this.namespace,
          labelSelector,
        });

        const pod = podList.items[0];
        podName = pod?.metadata?.name;

        if (podName) {
          const podStatus = pod?.status;
          if (
            podStatus?.phase === 'Running' &&
            podStatus?.containerStatuses?.[0]?.ready === true &&
            podStatus?.containerStatuses?.[0]?.state?.running
          ) {
            podReady = true;
            break;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        retries--;
      } catch (error) {
        this.logger.error(
          `Error while waiting for pod for job ${jobName}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
        retries--;
        if (retries === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!podName || !podReady) {
      throw new InternalServerErrorException(
        `K6 pod not ready after retries for job ${jobName}. Label selector: ${labelSelector}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const log = new k8s.Log(this.kc);
    const stream = new PassThrough();

    stream.on('data', (chunk) => {
      const log = chunk.toString().trim();
      onLog(log);
    });

    stream.on('error', (error) => {
      this.logger.error(
        `Error streaming logs from pod ${podName} for job ${jobName}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    });

    try {
      await log.log(this.namespace, podName, 'k6', stream, {
        follow: true,
        tailLines: 10,
        pretty: false,
      });

      return stream;
    } catch (error) {
      this.logger.error(
        `Failed to stream logs from pod ${podName} for job ${jobName}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new InternalServerErrorException(
        `Failed to stream logs from pod ${podName} for job ${jobName}:`,
      );
    }
  }

  async watchJobCompletion(
    runHistoryId: string,
    onComplete: (status: RunHistoryStatus) => Promise<void>,
  ): Promise<void> {
    const jobName = `k6-load-test-${runHistoryId}`;
    const watch = new Watch(this.kc);
    let abortController: AbortController;

    try {
      abortController = await watch.watch(
        `/apis/batch/v1/namespaces/${this.namespace}/jobs`,
        { fieldSelector: `metadata.name=${jobName}` },
        async (_type, obj: k8s.V1Job) => {
          const status = obj.status;
          if (!status) return;

          const activePods = status.active ?? 0;
          if (activePods === 0) {
            await onComplete(RunHistoryStatus.SUCCESS);
            if (abortController) {
              abortController.abort();
            }
            await this.cleanUpK6Job(runHistoryId);
          }
        },
        (err) => {
          if (err) {
            if (err.name === 'AbortError') {
              this.logger.log(`Watch aborted for job ${jobName} (expected)`);
            } else {
              this.logger.error(`Watch error for job ${jobName}:`, err);
              onComplete(RunHistoryStatus.FAILED);
              if (abortController) {
                abortController.abort();
              }
              void this.cleanUpK6Job(runHistoryId);
            }
          }
        },
      );
    } catch (err) {
      this.logger.error(`Failed to watch job ${jobName}:`, err);
      throw new InternalServerErrorException(`Failed to watch job ${jobName}:`);
    }
  }

  async getUserRunningJobs(userId: string): Promise<K8sJob[]> {
    const res = await this.batchApi.listNamespacedJob({
      namespace: this.namespace,
      labelSelector: `user-id=${userId}`,
    });

    return res.items
      .filter((job) => !job.status?.succeeded && !job.status?.failed)
      .map((job) => ({
        runHistoryId: job.metadata?.labels?.runHistoryId,
        scenarioId: job.metadata?.labels?.scenarioId,
      }));
  }
}
