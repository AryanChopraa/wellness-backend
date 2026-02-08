import { Request, Response, NextFunction } from 'express';

export interface RequestWithBlocked extends Request {
  isBlocked?: boolean;
}

/**
 * Sets req.isBlocked = false so it is always defined. Auth middleware will set it from user when loaded.
 */
export function setBlockedFlag(req: RequestWithBlocked, _res: Response, next: NextFunction): void {
  req.isBlocked = false;
  next();
}

/**
 * Wraps res.json so every response includes success, message, and isBlocked.
 * Frontend can rely on these on every request.
 */
export function wrapResponse(req: RequestWithBlocked, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = function (body: Record<string, unknown> | unknown): Response {
    const obj = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    const status = res.statusCode;
    const success = status >= 200 && status < 300;
    const message = (obj.message as string) ?? (obj.error as string) ?? (success ? 'Success' : 'Something went wrong');
    const isBlocked = req.isBlocked === true;
    const wrapped = {
      success,
      message,
      isBlocked,
      ...obj,
    };
    return originalJson(wrapped);
  };
  next();
}
