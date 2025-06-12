import {
  InfluxQueryResult,
  MetricsQueryOptions,
} from '@/load-test/types/influxdb.types';
import serverConfig from '@/shared/config';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
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
            tags: ['run_history_id', 'scenario_id', 'flow_id', 'step_id'],
          },
          {
            measurement: 'http_req_failed',
            fields: { value: Influx.FieldType.FLOAT },
            tags: ['run_history_id', 'scenario_id', 'flow_id', 'step_id'],
          },
          {
            measurement: 'http_reqs',
            fields: { value: Influx.FieldType.FLOAT },
            tags: ['run_history_id', 'scenario_id', 'flow_id', 'step_id'],
          },
        ],
      });

      this.logger.log(`InfluxDB client initialized with URL: ${url}`);
    } catch (error) {
      this.client = undefined;
      this.logger.error('Failed to initialize InfluxDB client', error);
      throw new InternalServerErrorException(
        'Failed to initialize InfluxDB client',
      );
    }
  }

  async onModuleInit() {
    if (!this.client) {
      this.logger.error('InfluxDB client not initialized');
      return new InternalServerErrorException(
        'InfluxDB client not initialized',
      );
    }

    try {
      const databases = await this.client.getDatabaseNames();
      if (!databases.includes(this.database)) {
        await this.client.createDatabase(this.database);
        this.logger.log(`Created database: ${this.database}`);
      }
      this.logger.log('InfluxDB connection established and verified');
    } catch (error) {
      this.logger.error('Failed to verify InfluxDB connection', error);
      this.client = undefined;
    }
  }

  convertNanoDateToDate(nanoDate: Influx.INanoDate): Date {
    try {
      // Convert nanoseconds to milliseconds for JavaScript Date
      const nanoTime = Number(nanoDate.getNanoTime());
      const milliseconds = Math.floor(nanoTime / 1000000);
      return new Date(milliseconds);
    } catch (error) {
      this.logger.error('Failed to convert InfluxDB timestamp', error);
      throw new InternalServerErrorException(
        'Failed to convert InfluxDB timestamp',
      );
    }
  }

  async query<T extends InfluxQueryResult = InfluxQueryResult>(
    query: string,
  ): Promise<T[]> {
    if (!this.client) {
      throw new InternalServerErrorException('InfluxDB client not initialized');
    }

    try {
      const results = await this.client.query(query);
      return results as unknown as T[];
    } catch (error) {
      this.logger.error('Failed to execute query', error);
      throw new InternalServerErrorException('Failed to execute query');
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.ping(5000);
        this.logger.log('InfluxDB connection closed');
      } catch (error) {
        this.logger.error('Error closing InfluxDB connection', error);
        throw new InternalServerErrorException(
          'Error closing InfluxDB connection',
        );
      }
    }
  }

  async queryMetrics(
    options: MetricsQueryOptions,
  ): Promise<InfluxQueryResult[][]> {
    const { runHistoryId, interval, metrics, tags, runAt, endAt } = options;
    if (!runHistoryId) {
      return [[], [], []];
    }

    try {
      const tagFilters: string[] = [];
      if (tags) {
        if (tags.flow_id) tagFilters.push(`flow_id='${tags.flow_id}'`);
        if (tags.step_id) tagFilters.push(`step_id='${tags.step_id}'`);
      }

      const tagFilterCondition =
        tagFilters.length > 0 ? `AND ${tagFilters.join(' AND ')}` : '';
      const groupByFields = [`flow_id`, `step_id`];

      if (interval) groupByFields.unshift(`time(${interval})`);

      // TODO: add time range condition
      const runAtCondition = runAt
        ? ` AND time > '${runAt.toISOString()}'`
        : '';
      const endAtCondition = endAt
        ? ` AND time < '${endAt.toISOString()}'`
        : '';
      const groupByFieldsCondition =
        groupByFields.length > 0 ? `GROUP BY ${groupByFields.join(',')}` : '';

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
              WHERE run_history_id = '${runHistoryId}' ${tagFilterCondition}
              ${runAtCondition}
              ${endAtCondition}
              ${groupByFieldsCondition}
              ORDER BY time ASC
            `;
            break;
          case 'errors':
            measurement = 'errors';
            query = `
              SELECT 
                mean(value) as value,
                time
              FROM "${measurement}"
              WHERE run_history_id = '${runHistoryId}' ${tagFilterCondition}
              ${runAtCondition}
              ${endAtCondition}
              ${groupByFieldsCondition}
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
              WHERE run_history_id = '${runHistoryId}' ${tagFilterCondition}
              ${runAtCondition}
              ${endAtCondition}
              ${groupByFieldsCondition}
              ORDER BY time ASC
            `;
            break;
          default:
            this.logger.error(`Unsupported metric: ${metric}`);
            throw new InternalServerErrorException(`Failed to query metrics`);
        }

        return { query, measurement };
      });

      if (!this.client) {
        this.logger.error('InfluxDB client not initialized');
        throw new InternalServerErrorException('Failed to query metrics');
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
        throw new InternalServerErrorException('Failed to query metrics');
      }
    } catch (error) {
      this.logger.error(
        `Failed to query tag inspection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to query metrics');
    }
  }

  async getRunAt(runHistoryId: string): Promise<Date> {
    const query = `
      SELECT first(value) as value, time 
      FROM http_req_duration 
      WHERE run_history_id = '${runHistoryId}' 
      AND time > now() - 1h 
      ORDER BY time ASC
      LIMIT 1
    `;

    let retries = 0;
    const maxRetries = 60;
    let result = await this.query<InfluxQueryResult>(query);

    while (result.length === 0 && retries < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000));
      result = await this.query<InfluxQueryResult>(query);
      retries++;
    }

    if (result.length === 0) {
      throw new InternalServerErrorException(
        `InfluxDB timeout: cannot get run at for run history ${runHistoryId}`,
      );
    }

    return this.convertNanoDateToDate(result[0].time);
  }

  async getEndAt(runHistoryId: string): Promise<Date> {
    const query = `
      SELECT last(value) as value, time 
      FROM http_req_duration 
      WHERE run_history_id = '${runHistoryId}' 
      AND time > now() - 1h 
      ORDER BY time DESC
      LIMIT 1
    `;

    const result = await this.query<InfluxQueryResult>(query);
    if (!result || result.length === 0) {
      throw new InternalServerErrorException(
        `No data found for the given run history ID: ${runHistoryId}`,
      );
    }

    return this.convertNanoDateToDate(result[0].time);
  }
}
