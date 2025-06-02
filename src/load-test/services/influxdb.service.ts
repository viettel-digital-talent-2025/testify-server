import {
  InfluxQueryResult,
  MetricData,
  MetricsQueryOptions,
  TestMetrics,
} from '@/load-test/types/influxdb.types';
import serverConfig from '@/shared/config';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Influx from 'influx';

@Injectable()
export class InfluxDBService implements OnModuleInit {
  private readonly logger = new Logger(InfluxDBService.name);
  private readonly database: string;
  private client: Influx.InfluxDB | undefined;

  constructor() {
    const url = serverConfig.influxdb.INFLUXDB_URL;
    const username = serverConfig.influxdb.INFLUXDB_USERNAME;
    const password = serverConfig.influxdb.INFLUXDB_PASSWORD;
    this.database = serverConfig.influxdb.INFLUXDB_BUCKET;

    if (!url) {
      this.logger.error('INFLUXDB_URL is required');
      return;
    }

    try {
      // Parse URL to get host and port
      const host = serverConfig.influxdb.INFLUXDB_HOST;
      const port = parseInt(serverConfig.influxdb.INFLUXDB_PORT, 10);

      this.client = new Influx.InfluxDB({
        host,
        port,
        database: this.database,
        username,
        password,
        schema: [
          {
            measurement: 'http_req_duration',
            fields: { value: Influx.FieldType.FLOAT },
            tags: ['test_id', 'scenario_id', 'flow_id', 'step_id'],
          },
          {
            measurement: 'http_req_failed',
            fields: { value: Influx.FieldType.FLOAT },
            tags: ['test_id', 'scenario_id', 'flow_id', 'step_id'],
          },
          {
            measurement: 'http_reqs',
            fields: { value: Influx.FieldType.FLOAT },
            tags: ['test_id', 'scenario_id', 'flow_id', 'step_id'],
          },
        ],
      });

      this.logger.log(`InfluxDB client initialized with URL: ${url}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to initialize InfluxDB client: ${errorMessage}`,
      );
      this.client = undefined;
    }
  }

  async onModuleInit() {
    if (!this.client) {
      this.logger.error('InfluxDB client not initialized');
      return;
    }

    try {
      const databases = await this.client.getDatabaseNames();
      if (!databases.includes(this.database)) {
        await this.client.createDatabase(this.database);
        this.logger.log(`Created database: ${this.database}`);
      }
      this.logger.log('InfluxDB connection established and verified');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to verify InfluxDB connection: ${errorMessage}`,
      );
      this.client = undefined;
    }
  }

  async writeMetric(data: MetricData): Promise<void> {
    if (!this.client) {
      throw new Error('InfluxDB client not initialized');
    }

    try {
      const point = {
        measurement: data.measurement,
        fields: {
          value: data.value,
        },
        tags: data.tags || {},
        timestamp: data.timestamp || new Date(),
      };

      await this.client.writePoints([point]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to write metric: ${errorMessage}`, {
        measurement: data.measurement,
        tags: data.tags,
        error: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  convertNanoDateToDate(nanoDate: Influx.INanoDate): Date {
    try {
      // Convert nanoseconds to milliseconds for JavaScript Date
      const nanoTime = Number(nanoDate.getNanoTime());
      const milliseconds = Math.floor(nanoTime / 1000000);
      return new Date(milliseconds);
    } catch (error) {
      this.logger.error(
        `Failed to convert InfluxDB timestamp: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Return current date as fallback
      return new Date();
    }
  }

  async query<T extends InfluxQueryResult = InfluxQueryResult>(
    query: string,
  ): Promise<T[]> {
    if (!this.client) {
      throw new Error('InfluxDB client not initialized');
    }

    try {
      const results = await this.client.query(query);
      return results as unknown as T[];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to execute query: ${errorMessage}`);
      throw error;
    }
  }

  async getMetricsFromInfluxDB(scenarioId: string): Promise<TestMetrics> {
    if (!this.client) {
      throw new Error('InfluxDB client not initialized');
    }

    try {
      // Get the test start time from the first measurement
      const startTimeQuery = `
        SELECT first(value) as value, time 
        FROM http_req_duration 
        WHERE scenario_id = '${scenarioId}' 
        AND time > now() - 1h 
        GROUP BY * 
        LIMIT 1
      `;

      const startTimeResult =
        await this.query<InfluxQueryResult>(startTimeQuery);
      if (!startTimeResult || startTimeResult.length === 0) {
        throw new Error('No data found for the given scenario ID');
      }

      const startTime = this.convertNanoDateToDate(startTimeResult[0].time);
      const endTime = new Date();

      // Format time range for InfluxDB query
      const timeRange = `time >= '${startTime.toISOString()}' AND time <= '${endTime.toISOString()}'`;

      // Query for average response time (p95)
      const avgResponseTimeQuery = `
        SELECT percentile(value, 95) as value 
        FROM http_req_duration 
        WHERE scenario_id = '${scenarioId}' 
        AND ${timeRange}
        GROUP BY time(1m)
        FILL(null)
      `;

      // Query for error rate (total failed requests / total requests)
      const errorRateQuery = `
        SELECT mean(value) as value 
        FROM http_req_failed 
        WHERE scenario_id = '${scenarioId}' 
        AND ${timeRange}
        GROUP BY time(1m)
        FILL(null)
      `;

      // Query for requests per second using a different approach
      const requestsPerSecondQuery = `
        SELECT count(value) as value 
        FROM http_reqs 
        WHERE scenario_id = '${scenarioId}' 
        AND ${timeRange}
        GROUP BY time(1s)
        FILL(null)
      `;

      const [avgResponseTimeResult, errorRateResult, requestsPerSecondResult] =
        await Promise.all([
          this.query<InfluxQueryResult>(avgResponseTimeQuery),
          this.query<InfluxQueryResult>(errorRateQuery),
          this.query<InfluxQueryResult>(requestsPerSecondQuery),
        ]);

      // Calculate average values from the time series
      const calculateAverage = (results: InfluxQueryResult[]): number => {
        const validValues = results
          .map((r) => r.value)
          .filter((v) => v !== null && !isNaN(v));
        if (validValues.length === 0) return 0;
        return (
          validValues.reduce((sum, val) => sum + val, 0) / validValues.length
        );
      };

      const errorRate = calculateAverage(errorRateResult);
      const successRate = Math.max(0, 1 - errorRate);

      return {
        startTime,
        endTime,
        avgResponseTime: calculateAverage(avgResponseTimeResult),
        errorRate,
        successRate,
        requestsPerSecond: calculateAverage(requestsPerSecondResult),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get metrics: ${errorMessage}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.ping(5000);
        this.logger.log('InfluxDB connection closed');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error closing InfluxDB connection: ${errorMessage}`);
      }
    }
  }

  async queryMetrics(
    options: MetricsQueryOptions,
  ): Promise<InfluxQueryResult[][]> {
    const {
      scenarioId,
      duration = '1m',
      interval = '1s',
      metrics,
      tags,
      runAt,
      endAt,
    } = options;

    try {
      const tagFilters: string[] = [];
      if (tags) {
        if (tags.flow_id) tagFilters.push(`flow_id='${tags.flow_id}'`);
        if (tags.step_id) tagFilters.push(`step_id='${tags.step_id}'`);
      }

      const tagFilterCondition =
        tagFilters.length > 0 ? `AND ${tagFilters.join(' AND ')}` : '';

      const timeRange = this.parseDuration(duration);

      const queries = metrics.map((metric) => {
        let query = '';
        let measurement = '';

        // Map metric names to actual InfluxDB measurements
        switch (metric) {
          case 'http_req_duration':
            measurement = 'http_req_duration';
            query = `
              SELECT 
                mean(value) as mean,
                percentile(value, 95) as percentile_95,
                time
              FROM "${measurement}"
              WHERE scenario_id = '${scenarioId}' ${tagFilterCondition}
              AND time > ${runAt ? `'${runAt.toISOString()}'` : timeRange}
              AND time < ${endAt ? `'${endAt.toISOString()}'` : 'now()'}
              GROUP BY time(${interval}), flow_id, step_id
              ORDER BY time ASC
            `;
            break;
          case 'errors':
            measurement = 'errors'; // Use our custom errors measurement
            query = `
              SELECT 
                mean(value) as value,
                time
              FROM "${measurement}"
              WHERE scenario_id = '${scenarioId}' ${tagFilterCondition}
              AND time > ${runAt ? `'${runAt.toISOString()}'` : timeRange}
              AND time < ${endAt ? `'${endAt.toISOString()}'` : 'now()'}
              GROUP BY time(${interval}), flow_id, step_id
              ORDER BY time ASC
            `;
            break;
          case 'http_reqs':
            measurement = 'http_reqs';
            query = `
              SELECT 
                count(value) as value,
                time
              FROM "${measurement}"
              WHERE scenario_id = '${scenarioId}' ${tagFilterCondition}
              AND time > ${runAt ? `'${runAt.toISOString()}'` : timeRange}
              AND time < ${endAt ? `'${endAt.toISOString()}'` : 'now()'}
              GROUP BY time(${interval}), flow_id, step_id
              ORDER BY time ASC
            `;
            break;
          default:
            throw new Error(`Unsupported metric: ${metric}`);
        }

        return { query, measurement };
      });

      if (!this.client) {
        throw new Error('InfluxDB client not initialized');
      }

      try {
        const queryResults = await Promise.all(
          queries.map(({ query }) => this.query<InfluxQueryResult>(query)),
        );

        return queryResults;
      } catch (error) {
        this.logger.error(
          `Failed to query metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    } catch (error) {
      this.logger.error(
        `Failed to query tag inspection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private parseDuration(duration: string): string {
    // If duration is a number (in seconds), convert to string with 's' unit
    const numericDuration = parseInt(duration, 10);
    if (!isNaN(numericDuration)) {
      return `time > now() - ${numericDuration}s`;
    }

    // Otherwise parse with unit
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1), 10);

    if (isNaN(value)) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    switch (unit) {
      case 's':
        return `time > now() - ${value}s`;
      case 'm':
        return `time > now() - ${value}m`;
      case 'h':
        return `time > now() - ${value}h`;
      case 'd':
        return `time > now() - ${value}d`;
      default:
        throw new Error(`Unsupported duration unit: ${unit}`);
    }
  }
}
