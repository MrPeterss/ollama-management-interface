import type { Request, Response, NextFunction } from 'express';

/**
 * Server secret validation - for admin endpoints (Bearer token must match SERVER_SECRET_KEY)
 */
export function validateServerSecret(
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  const secret = process.env.SERVER_SECRET_KEY;
  if (!secret) {
    return res.status(503).json({ error: 'Server secret not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization' });
  }

  const token = authHeader.substring(7);
  if (token !== secret) {
    return res.status(403).json({ error: 'Invalid server secret' });
  }

  next();
}
