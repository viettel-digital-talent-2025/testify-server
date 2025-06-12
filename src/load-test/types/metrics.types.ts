import {
  BottleneckSeverity,
  BottleneckSource,
  RunHistoryStatus,
} from '@prisma/client';

export interface MetricsQuery {
  runHistoryId?: string;
  scenarioId: string;
  userId: string;
  interval?: string; // e.g., "5s", "1m"
  runAt?: string;
  endAt?: string;
  tags?: {
    flow_id?: string;
    step_id?: string;
  };
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface LatencyPoint {
  timestamp: string;
  avg: number;
  p95: number;
}

export interface Metrics {
  latency: LatencyPoint[];
  throughput: TimeSeriesPoint[];
  errorRate: TimeSeriesPoint[];
}

export interface BottleneckPoint {
  id: string;
  timestamp: Date;
  severity: BottleneckSeverity;
  source: BottleneckSource[];
  p95Latency: number;
  avgLatency: number;
  throughput: number;
  errorRate: number;
  analysis: string | null;
}

export interface MetricsResponse {
  runHistoryId?: string;
  scenarioId: string;
  scenarioName: string;
  interval?: string;
  tags?: {
    flow_id?: string;
    step_id?: string;
  };
  metrics: Metrics;
  bottlenecks: BottleneckPoint[];
  status: RunHistoryStatus;
  progress: number;
  lastUpdated: string;
  runAt: string | null;
  endAt: string | null;
}
