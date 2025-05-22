import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  role: Role;
  iat?: number;
}
