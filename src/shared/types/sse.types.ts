export interface SSEEvent<T> {
  data?: T;
  event: string;
  id: string;
  retry: number;
}
