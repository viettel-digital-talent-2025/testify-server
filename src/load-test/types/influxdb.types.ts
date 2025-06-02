import * as Influx from 'influx';

export interface InfluxDBMetric {
  _measurement: string;
  _value: number;
  _time: string;
  scenario_id: string;
  scenario_name: string;
  test_type: string;
  mean?: number;
  percentile_95?: number;
}

export interface InfluxDBQueryParams {
  scenarioId: string;
  duration: string;
  metrics: string[];
  interval?: string;
}

export interface InfluxDBQueryResult {
  metrics: InfluxDBMetric[];
}

export interface TestMetrics {
  startTime: Date;
  endTime: Date;
  avgResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  successRate: number;
}

export interface MetricData {
  measurement: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface InfluxQueryResult {
  time: Influx.INanoDate;
  value: number;
  scenario_id: string;
  scenario_name: string;
  test_type: string;
  mean?: number;
  percentile_95?: number;
}

export interface MetricsQueryOptions {
  scenarioId: string;
  duration?: string;
  interval?: string;
  metrics: string[];
  tags?: {
    flow_id?: string;
    step_id?: string;
  };
  runAt?: Date;
  endAt?: Date | null;
}

export interface TagInspectionResult {
  key: string;
  value: string;
}
