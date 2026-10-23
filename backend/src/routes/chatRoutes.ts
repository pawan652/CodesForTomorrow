import { Router } from 'express';
import {
  createChat,
  getChatMessages,
  markChatMessageRead,
  sendChatMessage,
  streamChatMessages,
  updateChatLastSeen,
} from '../controllers/chatController';

const router = Router();

router.post('/create', createChat);
router.post('/:chatId/message/send', sendChatMessage);
router.get('/:chatId/stream', streamChatMessages);
router.get('/:chatId/messages', getChatMessages);
router.post('/:chatId/message/:messageId/read', markChatMessageRead);
router.post('/:chatId/lastseen', updateChatLastSeen);

export default router;
