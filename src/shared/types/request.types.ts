export interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

export interface RequestWithCookies extends Request {
  cookies: {
    refreshToken?: string;
  };
}
