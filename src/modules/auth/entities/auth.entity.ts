export class AuthEntity {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    avatar?: string;
    phone?: string;
  };

  constructor(data: Partial<AuthEntity>) {
    Object.assign(this, data);
  }
}