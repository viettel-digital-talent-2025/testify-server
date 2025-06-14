import {
  Bottleneck,
  BottleneckSeverity,
  BottleneckSource,
  RunHistory,
  Scenario,
  ScenarioFlow,
  ScenarioFlowStep,
} from '@prisma/client';

export interface BottleneckDto {
  id: string;
  userId: string;
  scenarioId: string;
  runHistoryId: string;
  flowId: string;
  stepId: string;
  severity: BottleneckSeverity;
  timestamp: Date;
  avgLatency: number;
  p95Latency: number;
  throughput: number;
  errorRate: number;
  source: BottleneckSource[];
  alertAt: Date | null;
  isRead: boolean;
  analysis: string | null;
  user: { id: string; email: string };
  scenario: { id: string; name: string };
  flow: { id: string; name: string };
  step: { id: string; name: string };
}

export interface BottleneckEvent {
  event: 'bottlenecks';
  severity: BottleneckSeverity;
  timestamp: string;
  userId: string;
  runHistoryId: string;
  scenarioId: string;
  scenarioName: string;
  flowId: string;
  flowName: string;
  stepId: string;
  stepName: string;
}

interface BottleneckStep extends ScenarioFlowStep {
  bottlenecks: Bottleneck[];
}

interface BottleneckFlow extends ScenarioFlow {
  steps: BottleneckStep[];
}

interface BottleneckScenario extends Scenario {
  flows: BottleneckFlow[];
}

export interface BottleneckRunHistory extends RunHistory {
  scenario: BottleneckScenario;
}
