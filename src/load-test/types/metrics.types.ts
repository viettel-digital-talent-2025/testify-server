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

export interface MetricsQuery {
  userId: string;
  scenarioId: string;
  runHistoryId?: string;
  duration?: string;
  interval?: string; // e.g., "5s", "1m"
  tags?: {
    flow_id?: string;
    step_id?: string;
  };
}

export interface MetricsResponse {
  scenarioId: string;
  runHistoryId?: string;
  scenarioName: string;
  duration: string;
  interval: string;
  tags?: {
    flow_id?: string;
    step_id?: string;
  };
  metrics: Metrics;
  progress: number;
  lastUpdated: string;
  runAt: string;
  endAt: string | null;
}
