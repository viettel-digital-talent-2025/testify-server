import {
  Bottleneck,
  BottleneckSeverity,
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
  latency: number;
  throughput: number;
  errorRate: number;
  alertAt: Date | null;
  isRead: boolean;
  analysis: string | null;
  user: { id: string; email: string };
  scenario: { id: string; name: string };
  flow: { id: string; name: string };
  step: { id: string; name: string };
}

export interface BottleneckEvent {
  type: 'bottlenecks';
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

export interface SseEvent {
  data: string;
  type: string;
  id: string;
  retry: number;
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
