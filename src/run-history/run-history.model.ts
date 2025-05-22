import { Prisma, RunHistoryStatus } from '@prisma/client';

export type RunHistoryCreateInput = Prisma.RunHistoryCreateInput;
export type RunHistoryUpdateInput = Prisma.RunHistoryUpdateInput;
export type RunHistoryWhereInput = Prisma.RunHistoryWhereInput;
export type RunHistoryWhereUniqueInput = Prisma.RunHistoryWhereUniqueInput;
export type RunHistorySelect = Prisma.RunHistorySelect;

export interface RunHistoryMetrics {
  startTime: Date;
  endTime: Date;
  avgResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  successRate: number;
}

export interface RunHistoryWithMetrics {
  id: string;
  scenarioId: string;
  scenario: {
    id: string;
    name: string;
  };
  runAt: Date;
  vus: number;
  duration: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  status: RunHistoryStatus;
  rawResultUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
