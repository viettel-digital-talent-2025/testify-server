export interface CreateRunHistoryMetricsDto {
  runHistoryId: string;
  flowId: string;
  stepId: string;
  avgLatency: number;
  p95Latency: number;
  throughput: number;
  errorRate: number;
}
