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
  progress: number;
  lastUpdated: string;
  runAt: string | null;
  endAt: string | null;
}
