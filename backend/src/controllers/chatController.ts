import { Request, Response } from 'express';
import { assertChatMember, createOrGetChat } from '../services/chatService';
import {
  getMessages,
  markMessageRead,
  sendMessage,
  updateLastSeen,
  watchLatestMessages,
} from '../services/messageService';
import { sendError } from '../utils/httpError';
import { readMessageId, readPositiveInt } from '../utils/parse';

const MAX_MESSAGE_LENGTH = 2000;

function readChatId(req: Request, res: Response): number | null {
  const chatId = readPositiveInt(req.params.chatId);
  if (chatId === null) {
    res.status(400).json({ error: 'chatId must be a positive whole number' });
    return null;
  }
  return chatId;
}

function currentUserId(req: Request, res: Response): number | null {
  if (req.userId === undefined) {
    res.status(401).json({ error: 'Please log in again.' });
    return null;
  }
  return req.userId;
}

function rejectImpersonation(sentId: unknown, userId: number, res: Response): boolean {
  if (sentId === undefined) {
    return false;
  }
  if (readPositiveInt(sentId) !== userId) {
    res.status(403).json({ error: 'You cannot act as another user' });
    return true;
  }
  return false;
}

export async function createChat(req: Request, res: Response): Promise<void> {
  try {
    const userId = currentUserId(req, res);
    if (userId === null) return;
    if (rejectImpersonation(req.body?.userAId, userId, res)) return;

    const otherUserId = readPositiveInt(req.body?.userId ?? req.body?.userBId);
    if (otherUserId === null) {
      res.status(400).json({ error: 'userId must be a positive whole number' });
      return;
    }

    if (otherUserId === userId) {
      res.status(400).json({ error: 'A user cannot create a chat with themselves' });
      return;
    }

    const result = await createOrGetChat(userId, otherUserId);
    res.status(result.created ? 201 : 200).json({
      chatId: result.chatId,
      created: result.created,
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function sendChatMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = currentUserId(req, res);
    if (userId === null) return;

    const chatId = readChatId(req, res);
    if (chatId === null) return;
    if (rejectImpersonation(req.body?.senderId, userId, res)) return;

    const textValue: unknown = req.body?.text ?? req.body?.message;
    if (typeof textValue !== 'string' || textValue.trim() === '') {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const text = textValue.trim();
    if (text.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: `text must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
      return;
    }

    const message = await sendMessage(chatId, userId, text);
    res.status(201).json({ chatId, ...message });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getChatMessages(req: Request, res: Response): Promise<void> {
  try {
    const userId = currentUserId(req, res);
    if (userId === null) return;

    const chatId = readChatId(req, res);
    if (chatId === null) return;
    if (rejectImpersonation(req.query.userId, userId, res)) return;

    let limit = 50;
    if (req.query.limit !== undefined && req.query.limit !== '') {
      const parsedLimit = readPositiveInt(req.query.limit);
      if (parsedLimit === null || parsedLimit > 100) {
        res.status(400).json({ error: 'limit must be a whole number from 1 to 100' });
        return;
      }
      limit = parsedLimit;
    }

    let before: Date | null = null;
    const beforeQuery = req.query.before;
    if (typeof beforeQuery === 'string' && beforeQuery.trim() !== '') {
      const parsedBefore = new Date(beforeQuery);
      if (Number.isNaN(parsedBefore.getTime())) {
        res.status(400).json({ error: 'before must be a valid date-time' });
        return;
      }
      before = parsedBefore;
    } else if (beforeQuery !== undefined && beforeQuery !== '') {
      res.status(400).json({ error: 'before must be a valid date-time' });
      return;
    }

    const page = await getMessages(chatId, userId, limit, before);
    res.status(200).json(page);
  } catch (error) {
    sendError(res, error);
  }
}

export async function streamChatMessages(req: Request, res: Response): Promise<void> {
  const userId = currentUserId(req, res);
  if (userId === null) return;

  const chatId = readChatId(req, res);
  if (chatId === null) return;

  try {
    await assertChatMember(chatId, userId);
  } catch (error) {
    sendError(res, error);
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let closed = false;
  const unsubscribe = watchLatestMessages(
    chatId,
    (messages) => {
      if (!closed) {
        res.write(`data: ${JSON.stringify({ messages })}\n\n`);
      }
    },
    (error) => {
      console.error(error);
      if (!closed) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Could not listen for messages' })}\n\n`);
      }
    }
  );

  const timer = setInterval(() => {
    if (!closed) {
      res.write(': ping\n\n');
    }
  }, 25000);

  req.on('close', () => {
    closed = true;
    clearInterval(timer);
    unsubscribe();
  });
}

export async function markChatMessageRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = currentUserId(req, res);
    if (userId === null) return;

    const chatId = readChatId(req, res);
    if (chatId === null) return;
    if (rejectImpersonation(req.body?.userId, userId, res)) return;

    const messageId = readMessageId(req.params.messageId);
    if (messageId === null) {
      res.status(400).json({ error: 'messageId is not valid' });
      return;
    }

    const receipt = await markMessageRead(chatId, messageId, userId);
    res.status(200).json(receipt);
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateChatLastSeen(req: Request, res: Response): Promise<void> {
  try {
    const userId = currentUserId(req, res);
    if (userId === null) return;

    const chatId = readChatId(req, res);
    if (chatId === null) return;
    if (rejectImpersonation(req.body?.userId, userId, res)) return;

    const messageId = readMessageId(req.body?.messageId);
    if (messageId === null) {
      res.status(400).json({ error: 'messageId is required' });
      return;
    }

    const lastSeen = await updateLastSeen(chatId, userId, messageId);
    res.status(200).json(lastSeen);
  } catch (error) {
    sendError(res, error);
  }
}
