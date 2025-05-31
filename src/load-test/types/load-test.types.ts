import { ChildProcess } from 'child_process';

import {
  RunHistoryStatus,
  Scenario,
  ScenarioFlow,
  ScenarioFlowStep,
} from '@prisma/client';

export interface Endpoint {
  id: string;
  name: string;
  method: string;
  endpoint: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface ScenarioWithEndpoints extends Omit<Scenario, 'Flows'> {
  endpoints: Endpoint[];
}

export interface K6Metrics {
  http_req_failed?: {
    values: {
      rate: number;
    };
  };
  http_req_duration?: {
    values: {
      avg: number;
    };
  };
  http_reqs?: {
    values: {
      rate: number;
    };
  };
}

export interface K6Result {
  metrics: K6Metrics;
}

export interface ActiveTest {
  process: ChildProcess;
  runHistoryId: string;
}

export interface LoadTestCompletedEvent {
  scenarioId: string;
  runHistoryId: string;
  status: RunHistoryStatus;
}

export interface LoadTestStartedEventInput {
  scenarioId: string;
  runHistoryId: string;
  status?: RunHistoryStatus;
}

export type ScenarioWithFlowsAndSteps = Scenario & {
  flows: Array<
    ScenarioFlow & {
      steps: Array<
        ScenarioFlowStep & {
          config: {
            method?: string;
            url?: string;
            body?: Record<string, unknown>;
            headers?: Record<string, string>;
          };
        }
      >;
    }
  >;
};

export interface LoadTestStatusEvent {
  scenarioId: string;
  runHistoryId: string;
  status: RunHistoryStatus;
  metrics?: {
    avgResponseTime: number;
    errorRate: number;
    successRate: number;
    requestsPerSecond: number;
  };
}
