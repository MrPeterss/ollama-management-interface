import type { Request, Response } from 'express';
import { z } from 'zod';
import * as keysService from './keysService.js';

const issueKeysSchema = z.object({
  descriptions: z
    .array(z.string())
    .min(1, 'At least one description is required')
    .max(50),
});

const revokeKeysSchema = z.object({
  keyIds: z
    .array(z.number().int().positive())
    .min(1, 'At least one keyId is required')
    .max(100),
});

function validationErrorResponse(res: Response, error: z.ZodError): Response {
  return res.status(400).json({
    error: 'Validation failed',
    details: error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  });
}

export async function issueKeys(req: Request, res: Response): Promise<Response> {
  const validation = issueKeysSchema.safeParse(req.body);
  if (!validation.success) {
    return validationErrorResponse(res, validation.error);
  }

  const { descriptions } = validation.data;

  try {
    const keys = await keysService.issueKeys(descriptions);
    return res.json({ keys });
  } catch (error) {
    console.error('Error issuing keys:', error);
    return res.status(500).json({ error: 'Failed to issue keys' });
  }
}

export async function revokeKeys(req: Request, res: Response): Promise<Response> {
  const validation = revokeKeysSchema.safeParse(req.body);
  if (!validation.success) {
    return validationErrorResponse(res, validation.error);
  }

  const { keyIds } = validation.data;

  try {
    const { revoked } = await keysService.revokeKeys(keyIds);
    return res.json({
      revoked,
      keyIds,
      message: `Successfully revoked ${revoked} key(s)`,
    });
  } catch (error) {
    console.error('Error revoking keys:', error);
    return res.status(500).json({ error: 'Failed to revoke keys' });
  }
}
