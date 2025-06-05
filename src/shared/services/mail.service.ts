import { BottleneckDto } from '@/bottlenecks/bottlenecks.dto';
import serverConfig from '@/shared/config';
import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: serverConfig.gmail.GMAIL_USER,
        pass: serverConfig.gmail.GMAIL_APP_PASSWORD,
      },
    }) as Transporter;
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: serverConfig.gmail.GMAIL_FROM,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, otp: string) {
    const subject = 'Password Reset Request';
    const html = `
      <h1>Password Reset Request</h1>
      <p>You have requested to reset your password. Use the following OTP to reset your password:</p>
      <h2 style="color: #4CAF50; font-size: 24px; letter-spacing: 2px;">${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await this.sendMail(email, subject, html);
  }

  async sendBottleneckAlertEmail(bottleneck: BottleneckDto) {
    const subject = `Bottleneck Alert: ${bottleneck.severity} severity in ${bottleneck.scenario.name}`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background-color: #f8f9fa; 
              padding: 20px; 
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .severity-high { color: #dc3545; }
            .severity-medium { color: #ffc107; }
            .severity-low { color: #28a745; }
            .metrics { 
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
            }
            .metric-item {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 5px 0;
              border-bottom: 1px solid #eee;
            }
            .metric-label { font-weight: bold; }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Bottleneck Alert</h1>
              <p style="margin: 10px 0 0 0;">A performance bottleneck has been detected in your system.</p>
            </div>

            <h2 class="severity-${bottleneck.severity.toLowerCase()}">
              ${bottleneck.severity} Severity Alert
            </h2>

            <div class="metrics">
              <h3>Scenario Details</h3>
              <div class="metric-item">
                <span class="metric-label">Scenario:</span>
                <span>${bottleneck.scenario.name}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Flow:</span>
                <span>${bottleneck.flow.name}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Step:</span>
                <span>${bottleneck.step.name}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Detected At:</span>
                <span>${new Date(bottleneck.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div class="metrics">
              <h3>Performance Metrics</h3>
              <div class="metric-item">
                <span class="metric-label">Latency:</span>
                <span>${bottleneck.latency.toFixed(1)} ms</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Throughput:</span>
                <span>${bottleneck.throughput.toFixed(1)} req/s</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Error Rate:</span>
                <span>${(bottleneck.errorRate * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div class="footer">
              <p>This is an automated alert from your performance monitoring system.</p>
              <p>Please investigate this bottleneck to ensure optimal system performance.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendMail(bottleneck.user.email, subject, html);
  }
}
