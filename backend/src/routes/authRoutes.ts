import { Router } from 'express';
import { currentUser, loginUser, logoutUser } from '../controllers/authController';

const router = Router();

router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', currentUser);

export default router;
