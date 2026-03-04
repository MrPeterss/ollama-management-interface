import { Router } from 'express';
import { validateServerSecret } from '../middleware/authentication.js';
import * as statsController from './statsController.js';

const router = Router();

router.use(validateServerSecret);

router.get('/', statsController.getKeysStats);
router.get('/:keyId', statsController.getKeyStats);

export { router as statsRouter };
