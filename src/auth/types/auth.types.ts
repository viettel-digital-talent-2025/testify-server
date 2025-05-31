import { Request } from 'express';

import { TokenPayload } from '@/shared/types/jwt.types';

import { USER_KEY } from '@/auth/constants/auth.constant';

export interface RequestWithAuth extends Request {
  headers: {
    authorization?: string;
  };
  cookies: {
    refreshToken?: string;
  };
  [USER_KEY]?: TokenPayload;
}
