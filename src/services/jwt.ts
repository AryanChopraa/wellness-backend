import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '../types/auth';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
