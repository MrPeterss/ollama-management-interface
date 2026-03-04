import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

export async function validateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }

  const apiKey = authHeader.substring(7);

  try {
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
    });

    if (!key || !key.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    const now = new Date();
    await Promise.all([
      prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: now },
      }),
      prisma.apiKeyRequest.create({
        data: { apiKeyId: key.id, createdAt: now },
      }),
    ]);

    return next();
  } catch (error) {
    console.error('Error validating API key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
