import { Router } from 'express';
import { validateServerSecret } from '../middleware/authentication.js';
import * as keysController from './keysController.js';

const router = Router();

router.use(validateServerSecret);

router.post('/issue', keysController.issueKeys);
router.post('/revoke', keysController.revokeKeys);

export { router as keysRouter };
