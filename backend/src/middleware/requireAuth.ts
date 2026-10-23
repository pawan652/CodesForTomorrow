import { NextFunction, Request, Response } from 'express';
import { readUserIdFromToken } from '../services/authService';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;
  const userId = typeof token === 'string' ? readUserIdFromToken(token) : null;

  if (userId === null) {
    res.status(401).json({ error: 'Please log in again.' });
    return;
  }

  req.userId = userId;
  next();
}
