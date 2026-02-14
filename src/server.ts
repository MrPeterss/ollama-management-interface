import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma.js';

const app = express();

// Middleware
app.use(express.json());

// API Key validation middleware
const validateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }

  const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
    });

    if (!key || !key.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return next();
  } catch (error) {
    console.error('Error validating API key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Health check endpoint (no auth required)
app.get('/health', async (_: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// Chat endpoint
app.post('/chat', validateApiKey, async (req: Request, res: Response) => {
  const { messages, stream = false } = req.body;

  // Validate messages
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages array' });
  }

  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'nemotron-3-nano';

  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
        keep_alive: -1,
      }),
    });

    // Forward status code
    res.status(response.status);
    
    // Forward relevant headers
    const headersToForward = [
      'content-type',
      'transfer-encoding',
      'cache-control',
      'content-encoding',
    ];
    
    headersToForward.forEach((header) => {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    // Stream the response body
    if (response.body) {
      const reader = response.body.getReader();
      
      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Write chunk to response
            if (!res.write(value)) {
              // If write buffer is full, wait for drain event
              await new Promise((resolve) => res.once('drain', resolve));
            }
          }
          res.end();
        } catch (error) {
          console.error('Error streaming response:', error);
          if (!res.headersSent) {
            res.status(502).json({ error: 'Error streaming response' });
          }
          res.end();
        }
      };
      
      return readStream();
    } else {
      return res.end();
    }
  } catch (error) {
    console.error('Error connecting to Ollama:', error);
    if (!res.headersSent) {
      return res.status(502).json({ error: 'Failed to connect to Ollama' });
    }
  }
});

const port = process.env.PORT || '8000';

const server = app.listen(port, async () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`Proxying to Ollama at ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);

  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');

  server.close(async () => {
    console.log('HTTP server closed');
    await prisma.$disconnect();
    console.log('Database disconnected');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
