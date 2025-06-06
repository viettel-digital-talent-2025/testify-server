import { RunHistoryStatus } from '@prisma/client';

export interface ActiveJob {
  scenarioId: string;
  runHistoryId: string;
  runAt: Date;
}

export interface LoadTestStatusEvent {
  runHistoryId: string;
  scenarioId: string;
  userId: string;
  status: RunHistoryStatus;
  runAt: Date;
  type: string;
  id: string;
  retry: number;
}

export interface EmitStatusUpdateProps {
  runHistoryId: string;
  scenarioId: string;
  userId: string;
  status: RunHistoryStatus;
  runAt: Date;
  redis?: boolean;
}
