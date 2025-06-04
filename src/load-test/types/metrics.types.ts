import { ApiProperty } from '@nestjs/swagger';

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
  runAt?: string;
  endAt?: string;
  tags?: {
    flow_id?: string;
    step_id?: string;
  };
}

export class MetricsResponse {
  @ApiProperty({ description: 'Metrics data' })
  data: any;

  @ApiProperty({ description: 'Query metadata' })
  metadata: any;
}
