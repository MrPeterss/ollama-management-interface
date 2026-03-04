import type { Request, Response } from 'express';
import { z } from 'zod';
import * as statsService from './statsService.js';

const keyIdsQuerySchema = z.object({
  keyIds: z
    .string({ message: 'keyIds query param is required' })
    .transform((s) => s.split(',').map((n) => parseInt(n.trim(), 10)))
    .pipe(
      z.array(z.number().int().positive()).min(1, 'At least one valid keyId required').max(100)
    ),
});

export async function getKeyStats(req: Request, res: Response): Promise<Response> {
  const keyIdParam = req.params.keyId;
  const keyId = parseInt(typeof keyIdParam === 'string' ? keyIdParam : '', 10);
  if (!Number.isInteger(keyId) || keyId < 1) {
    return res.status(400).json({ error: 'Invalid keyId' });
  }

  try {
    const stats = await statsService.getKeyStats(keyId);
    if (!stats) {
      return res.status(404).json({ error: `Key with id ${keyId} not found` });
    }
    return res.json(stats);
  } catch (error) {
    console.error('Error fetching key stats:', error);
    return res.status(500).json({ error: 'Failed to fetch key stats' });
  }
}

export async function getKeysStats(req: Request, res: Response): Promise<Response> {
  const keyIdsParam = req.query.keyIds;
  const keyIdsStr =
    typeof keyIdsParam === 'string'
      ? keyIdsParam
      : Array.isArray(keyIdsParam)
        ? String(keyIdsParam[0] ?? '')
        : '';
  const validation = keyIdsQuerySchema.safeParse({ keyIds: keyIdsStr });
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  const { keyIds } = validation.data;

  try {
    const stats = await statsService.getKeysStats(keyIds);
    return res.json({ stats });
  } catch (error) {
    console.error('Error fetching keys stats:', error);
    return res.status(500).json({ error: 'Failed to fetch keys stats' });
  }
}
