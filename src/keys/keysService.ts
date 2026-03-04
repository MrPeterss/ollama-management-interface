import { randomBytes } from 'crypto';
import { prisma } from '../prisma.js';

function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}

export interface IssuedKey {
  id: number;
  key: string;
  description: string | null;
}

export async function issueKeys(descriptions: string[]): Promise<IssuedKey[]> {
  const keys = await Promise.all(
    descriptions.map(async (description) => {
      const key = generateApiKey();
      const apiKey = await prisma.apiKey.create({
        data: { key, description: description || 'No description' },
      });
      return {
        id: apiKey.id,
        key: apiKey.key,
        description: apiKey.description,
      };
    })
  );
  return keys;
}

export interface RevokeKeysResult {
  revoked: number;
}

export async function revokeKeys(keyIds: number[]): Promise<RevokeKeysResult> {
  const result = await prisma.apiKey.updateMany({
    where: { id: { in: keyIds } },
    data: { isActive: false },
  });
  return { revoked: result.count };
}
