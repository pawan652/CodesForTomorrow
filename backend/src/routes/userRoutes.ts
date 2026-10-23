import { Router } from 'express';
import { getUserChats } from '../controllers/userController';

const router = Router();

router.get('/:userId/chats', getUserChats);

export default router;
