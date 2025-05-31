import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

import serverConfig from '@/shared/config';

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
}
