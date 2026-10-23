import { Request, Response } from 'express';
import { listOtherUsers } from '../services/authService';
import { listUserChats } from '../services/chatService';
import { sendError } from '../utils/httpError';
import { readPositiveInt } from '../utils/parse';

export async function getUserChats(req: Request, res: Response): Promise<void> {
  try {
    if (req.userId === undefined) {
      res.status(401).json({ error: 'Please log in again.' });
      return;
    }

    const userId = readPositiveInt(req.params.userId);
    if (userId === null) {
      res.status(400).json({ error: 'userId must be a positive whole number' });
      return;
    }

    if (userId !== req.userId) {
      res.status(403).json({ error: 'You cannot view another user\'s chats' });
      return;
    }

    const chats = await listUserChats(userId);
    res.status(200).json({ chats });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    if (req.userId === undefined) {
      res.status(401).json({ error: 'Please log in again.' });
      return;
    }

    const users = await listOtherUsers(req.userId);
    res.status(200).json({ users });
  } catch (error) {
    sendError(res, error);
  }
}
