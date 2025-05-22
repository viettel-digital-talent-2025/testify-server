import { Scenario, ScenarioFlow, ScenarioFlowStep } from '@prisma/client';
import { ChildProcess } from 'child_process';

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
}

export type ScenarioWithFlowsAndSteps = Scenario & {
  Flows: Array<
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
