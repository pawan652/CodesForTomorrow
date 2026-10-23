import { CookieOptions, Request, Response } from 'express';
import { getPublicUser, login, logout, readUserIdFromToken, signToken } from '../services/authService';
import { sendError } from '../utils/httpError';
import { readEmail } from '../utils/parse';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function loginUser(req: Request, res: Response): Promise<void> {
  try {
    const email = readEmail(req.body?.email);
    const password = req.body?.password;

    if (email === null) {
      res.status(400).json({ error: 'Enter a valid email address' });
      return;
    }

    if (typeof password !== 'string' || password.length === 0 || password.length > 100) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const user = await login(email, password);

    res.cookie('token', signToken(user.id), cookieOptions);
    res.status(200).json({ user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function logoutUser(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.token;
    const userId = typeof token === 'string' ? readUserIdFromToken(token) : null;
    if (userId !== null) {
      await logout(userId);
    }

    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
}

export async function currentUser(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.token;
    const userId = typeof token === 'string' ? readUserIdFromToken(token) : null;
    if (userId === null) {
      res.status(401).json({ error: 'Please log in again.' });
      return;
    }

    const user = await getPublicUser(userId);
    res.status(200).json({ user });
  } catch (error) {
    sendError(res, error);
  }
}
