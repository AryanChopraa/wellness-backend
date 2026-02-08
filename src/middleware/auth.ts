import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  userId?: string;
  user?: Record<string, unknown>;
}

/**
 * Optional auth: sets req.userId and req.user if valid token present.
 */
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    next();
    return;
  }
  const payload = verifyToken(token);
  if (!payload?.userId) {
    next();
    return;
  }
  req.userId = payload.userId;
  try {
    const user = await User.findById(payload.userId).lean();
    if (user) {
      if ((user as { isBlocked?: boolean }).isBlocked) {
        res.status(403).json({ error: 'Account is blocked' });
        return;
      }
      req.user = user as unknown as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  next();
}

/**
 * Require auth: 401 if no valid token or user not found.
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing or invalid authorization' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload?.userId) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.userId = payload.userId;
  try {
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    if ((user as { isBlocked?: boolean }).isBlocked) {
      res.status(403).json({ error: 'Account is blocked' });
      return;
    }
    req.user = user as unknown as Record<string, unknown>;
  } catch {
    res.status(500).json({ error: 'Server error' });
    return;
  }
  next();
}
