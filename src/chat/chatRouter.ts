import { Router } from 'express';
import { validateApiKey } from './chatAuthentication.js';
import { chat } from './chatController.js';

const router = Router();

router.post('/', validateApiKey, chat);

export { router as chatRouter };
