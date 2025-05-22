import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Influx from 'influx';

interface TestMetrics {
  startTime: Date;
  endTime: Date;
  avgResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  successRate: number;
}

interface MetricData {
  measurement: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

interface InfluxQueryResult {
  time: Influx.INanoDate;
  value: number;
  [key: string]: unknown;
}

@Injectable()
export class InfluxDBService implements OnModuleInit {
  private readonly logger = new Logger(InfluxDBService.name);
  private client: Influx.InfluxDB | undefined;
  private readonly database: string;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>(
      'INFLUXDB_URL',
      'http://localhost:8086',
    );
    const username = this.configService.get<string>('INFLUXDB_USERNAME', '');
    const password = this.configService.get<string>('INFLUXDB_PASSWORD', '');
    this.database = this.configService.get<string>('INFLUXDB_BUCKET', 'k6');

    if (!url) {
      this.logger.error('INFLUXDB_URL is required');
      return;
    }

    try {
      // Parse URL to get host and port
      const urlObj = new URL(url);
      const host = urlObj.hostname;
      const port = parseInt(urlObj.port || '8086', 10);

      this.client = new Influx.InfluxDB({
        host,
        port,
        database: this.database,
        username,
        password,
        schema: [
          {
            measurement: 'http_req_duration',
            fields: {
              value: Influx.FieldType.FLOAT,
            },
            tags: ['test_id', 'scenario_id'],
          },
          {
            measurement: 'http_req_failed',
            fields: {
              value: Influx.FieldType.FLOAT,
            },
            tags: ['test_id', 'scenario_id'],
          },
          {
            measurement: 'http_reqs',
            fields: {
              value: Influx.FieldType.FLOAT,
            },
            tags: ['test_id', 'scenario_id'],
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
      // Test connection by creating database if it doesn't exist
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
      this.logger.debug(`Metric written: ${data.measurement} = ${data.value}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to write metric: ${errorMessage}`);
      throw error;
    }
  }

  private convertNanoDateToDate(nanoDate: Influx.INanoDate): Date {
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
}
