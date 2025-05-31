import serverConfig from '@/shared/config';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import bcrypt from 'bcrypt';

@Injectable()
export class HashingService {
  async hash(value: string): Promise<string> {
    try {
      return await bcrypt.hash(value, serverConfig.jwt.SALT_ROUNDS);
    } catch {
      throw new InternalServerErrorException('Failed to hash password');
    }
  }

  async compare(value: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(value, hash);
    } catch {
      throw new InternalServerErrorException('Failed to compare passwords');
    }
  }
}
