import { Response } from 'express';

/**
 * Send an error response. The response wrapper middleware adds success, message, isBlocked to every res.json().
 * Frontend always receives { success: false, message, isBlocked, error }.
 */
export function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}
