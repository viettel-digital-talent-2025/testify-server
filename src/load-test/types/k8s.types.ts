export interface K8sJob {
  runHistoryId: string | undefined;
  scenarioId: string | undefined;
}

export interface CreateK6Job {
  runHistoryId: string;
  scenarioId: string;
  userId: string;
  script: string;
}
