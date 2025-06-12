import { MailService } from '@/shared/services/mail.service';
import { SSEEvent } from '@/shared/types/sse.types';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Observable, Subject } from 'rxjs';
import { BottleneckEvent } from './bottlenecks.dto';
import { BottlenecksRepository } from './bottlenecks.repository';

@Injectable()
export class BottlenecksService implements OnModuleInit, OnModuleDestroy {
  private usersSubjects = new Map<
    string,
    {
      subject: Subject<SSEEvent<BottleneckEvent>>;
      pingInterval: NodeJS.Timeout;
    }
  >();
  private lastAlertTimestamp = new Map<string, number>();
  private subscriber: Redis;

  constructor(
    private readonly mailService: MailService,
    private readonly bottlenecksRepository: BottlenecksRepository,
    @InjectRedis() private readonly redisClient: Redis,
  ) {}

  async onModuleInit() {
    this.subscriber = this.redisClient.duplicate();
    await this.subscriber.subscribe('bottlenecks');

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'bottlenecks') {
        this.handleAlert(JSON.parse(message));
      }
    });
  }

  onModuleDestroy() {
    this.subscriber.quit();
    this.usersSubjects.forEach(({ subject, pingInterval }) => {
      subject.complete();
      clearInterval(pingInterval);
    });
    this.usersSubjects.clear();
  }

  private async emitAlert(event: BottleneckEvent) {
    const subject = this.usersSubjects.get(event.userId);
    if (subject) {
      subject.subject.next({
        event: 'bottlenecks',
        id: `${event.scenarioId}:${event.runHistoryId}`,
        retry: 3000,
        data: event,
      });
    }
  }

  private async handleAlert(event: BottleneckEvent | null | undefined) {
    if (!event) return;

    const bottlenecks = await this.bottlenecksRepository.getBottlenecks(
      event.userId,
      event.scenarioId,
      event.runHistoryId,
      event.flowId,
      event.stepId,
    );

    // Check if we should send email (no alerts in last 10 minutes)
    const key = `${event.userId}:${event.runHistoryId}:${event.stepId}`;
    bottlenecks.forEach(async (bottleneck) => {
      if (
        !bottleneck.alertAt &&
        (!this.lastAlertTimestamp.get(key) ||
          this.lastAlertTimestamp.get(key)! < Date.now() - 10 * 60 * 1000)
      ) {
        this.emitAlert(event);
        this.lastAlertTimestamp.set(key, Date.now());
        await Promise.all([
          // this.mailService.sendBottleneckAlertEmail(bottleneck),
          this.bottlenecksRepository.update(bottleneck.id, {
            alertAt: new Date(),
          }),
        ]);
      }
    });
  }

  subscribeToUserAlerts(userId: string): Observable<SSEEvent<BottleneckEvent>> {
    let subject = this.usersSubjects.get(userId)?.subject;
    const isNewSubject = !subject;
    if (isNewSubject) {
      subject = new Subject<SSEEvent<BottleneckEvent>>();

      const pingInterval = setInterval(() => {
        subject!.next({
          event: 'ping',
          id: `ping:${userId}`,
          retry: 3000,
        });
      }, 15000);

      this.usersSubjects.set(userId, {
        subject,
        pingInterval,
      });
    }

    return new Observable<SSEEvent<BottleneckEvent>>((observer) => {
      const subscription = subject!.subscribe(observer);
      return () => {
        subscription.unsubscribe();
        this.usersSubjects.delete(userId);
      };
    });
  }

  async getBottlenecksRunHistory(userId: string) {
    return await this.bottlenecksRepository.getBottlenecksRunHistory(userId);
  }

  async getBottlenecksByRunHistoryId(userId: string, runHistoryId: string) {
    return await this.bottlenecksRepository.getBottlenecksByRunHistoryId(
      userId,
      runHistoryId,
    );
  }

  async analyzeBottlenecks(bottleneckId: string) {}

  async getBottlenecksCount(userId: string) {
    return await this.bottlenecksRepository.getBottlenecksCount(userId);
  }
}
