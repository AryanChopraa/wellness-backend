export interface JwtPayload {
  userId: string;
  email?: string;
  phone?: string;
}

export type OtpIdentifierType = 'email' | 'phone';
