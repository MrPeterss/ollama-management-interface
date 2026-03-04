import type { Request, Response } from 'express';
import { z } from 'zod';

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1, 'Message content cannot be empty'),
});

const chatRequestSchema = z.object({
  messages: z
    .array(messageSchema)
    .min(1, 'At least one message is required')
    .max(100, 'Too many messages (max 100)'),
  stream: z.boolean().optional().default(false),
});

export async function chat(req: Request, res: Response): Promise<void> {
  const validation = chatRequestSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: validation.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
    return;
  }

  const { messages, stream } = validation.data;

  const fetchUrl = process.env.FETCH_URL || 'http://vllm:8000/v1/chat/completions';
  const model = process.env.MODEL || 'openai/gpt-oss-20b';

  const abortController = new AbortController();

  req.on('close', () => {
    if (!res.writableEnded) {
      console.log('Client disconnected, aborting LLM request');
      abortController.abort();
    }
  });

  try {
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream, keep_alive: -1 }),
      signal: abortController.signal,
    });

    res.status(response.status);

    if (stream) {
      res.setHeader('X-Accel-Buffering', 'no');
    }

    const headersToForward = [
      'content-type',
      'transfer-encoding',
      'cache-control',
      'content-encoding',
    ];
    headersToForward.forEach((header) => {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.write(value)) {
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
      } finally {
        reader.releaseLock();
      }
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('LLM request aborted due to client disconnect');
      if (!res.headersSent) {
        res.status(499).end();
      }
      return;
    }
    console.error('Error connecting to LLM:', error);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to connect to LLM' });
    }
  }
}
