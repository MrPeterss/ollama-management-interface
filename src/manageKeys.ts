import 'dotenv/config';
import { prisma } from './prisma.js';
import { randomBytes } from 'crypto';

// Generate a secure random API key
function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}

async function createKey(description?: string) {
  const key = generateApiKey();
  const apiKey = await prisma.apiKey.create({
    data: {
      key,
      description: description || 'No description',
    },
  });
  console.log('\n✅ API Key created successfully!');
  console.log(`Key: ${apiKey.key}`);
  console.log(`Description: ${apiKey.description}`);
  console.log(`ID: ${apiKey.id}\n`);
}

async function listKeys() {
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
  });

  if (keys.length === 0) {
    console.log('\n📭 No API keys found.\n');
    return;
  }

  console.log('\n📋 API Keys:\n');
  for (const key of keys) {
    const status = key.isActive ? '✅ Active' : '❌ Inactive';
    const lastUsed = key.lastUsedAt
      ? `Last used: ${key.lastUsedAt.toISOString()}`
      : 'Never used';
    console.log(`ID: ${key.id}`);
    console.log(`Key: ${key.key}`);
    console.log(`Description: ${key.description || 'N/A'}`);
    console.log(`Status: ${status}`);
    console.log(`Created: ${key.createdAt.toISOString()}`);
    console.log(`${lastUsed}`);
    console.log('---');
  }
  console.log();
}

async function deactivateKey(keyId: number) {
  const apiKey = await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });
  console.log(`\n❌ API Key ${apiKey.id} deactivated.\n`);
}

async function activateKey(keyId: number) {
  const apiKey = await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: true },
  });
  console.log(`\n✅ API Key ${apiKey.id} activated.\n`);
}

async function deleteKey(keyId: number) {
  await prisma.apiKey.delete({
    where: { id: keyId },
  });
  console.log(`\n🗑️  API Key ${keyId} deleted.\n`);
}

// Main CLI handler
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'create':
        await createKey(args[0]);
        break;
      case 'list':
        await listKeys();
        break;
      case 'deactivate':
        if (!args[0]) {
          console.error('❌ Please provide a key ID');
          process.exit(1);
        }
        await deactivateKey(parseInt(args[0]));
        break;
      case 'activate':
        if (!args[0]) {
          console.error('❌ Please provide a key ID');
          process.exit(1);
        }
        await activateKey(parseInt(args[0]));
        break;
      case 'delete':
        if (!args[0]) {
          console.error('❌ Please provide a key ID');
          process.exit(1);
        }
        await deleteKey(parseInt(args[0]));
        break;
      default:
        console.log(`
🔑 API Key Manager

Usage:
  npm run keys create [description]  - Create a new API key
  npm run keys list                  - List all API keys
  npm run keys activate <id>         - Activate an API key
  npm run keys deactivate <id>       - Deactivate an API key
  npm run keys delete <id>           - Delete an API key

Examples:
  npm run keys create "Production key"
  npm run keys list
  npm run keys deactivate 1
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
