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
  runHistoryId?: string;
  duration?: string;
  interval?: string;
  metrics: string[];
  tags?: {
    flow_id?: string;
    step_id?: string;
  };
  runAt?: Date | null;
  endAt?: Date | null;
}
