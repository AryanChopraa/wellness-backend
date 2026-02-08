import { Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt';
import { User } from '../models/User';
import type { RequestWithBlocked } from './responseWrapper';

export interface AuthRequest extends RequestWithBlocked {
  userId?: string;
  user?: Record<string, unknown>;
}

/**
 * Optional auth: sets req.userId, req.user, and req.isBlocked if valid token present.
 * If token is valid but user is not found, sets req.isBlocked = true and returns 403 (response includes isBlocked: true).
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
    if (!user) {
      req.isBlocked = true;
      res.status(403).json({ error: 'Account not found' });
      return;
    }
    req.isBlocked = (user as { isBlocked?: boolean }).isBlocked === true;
    if (req.isBlocked) {
      res.status(403).json({ error: 'Account is blocked' });
      return;
    }
    req.user = user as unknown as Record<string, unknown>;
  } catch {
    // ignore
  }
  next();
}

/**
 * Require auth: 401 if no valid token; 403 with isBlocked: true if user not found or user blocked. Sets req.isBlocked from user (or true when user not found).
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
      req.isBlocked = true;
      res.status(403).json({ error: 'Account not found' });
      return;
    }
    req.isBlocked = (user as { isBlocked?: boolean }).isBlocked === true;
    if (req.isBlocked) {
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
