import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import serverConfig from '../config';

@Injectable()
export class HashingService {
  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, serverConfig.SALT_ROUNDS);
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
