import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';
import type { PublicUser } from '../types';
import { HttpError } from '../utils/httpError';

type UserRow = RowDataPacket & {
  id: number;
  name: string;
  email: string | null;
  password_hash: string | null;
  is_online: number | boolean;
};

const jwtSecret = process.env.JWT_SECRET ?? '';

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    isOnline: row.is_online === 1 || row.is_online === true,
  };
}

export function signToken(userId: number): string {
  return jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });
}

export function readUserIdFromToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (typeof payload === 'string') {
      return null;
    }

    const userId = payload.userId as unknown;
    if (typeof userId !== 'number' || !Number.isInteger(userId) || userId < 1) {
      return null;
    }
    return userId;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<PublicUser> {
  const [rows] = await pool.query<UserRow[]>(
    'select id, name, email, password_hash, is_online from users where email = ? limit 1',
    [email]
  );
  const user = rows[0];
  const hash = user?.password_hash;
  const passwordMatches = hash ? await bcrypt.compare(password, hash) : false;

  if (!user || !passwordMatches) {
    throw new HttpError(401, 'Invalid email or password');
  }

  await pool.query('update users set is_online = 1 where id = ?', [user.id]);
  return toPublicUser({ ...user, is_online: 1 });
}

export async function logout(userId: number): Promise<void> {
  await pool.query('update users set is_online = 0 where id = ?', [userId]);
}

export async function getPublicUser(userId: number): Promise<PublicUser> {
  const [rows] = await pool.query<UserRow[]>(
    'select id, name, email, password_hash, is_online from users where id = ? limit 1',
    [userId]
  );
  const user = rows[0];
  if (!user || !user.email) {
    throw new HttpError(401, 'Please log in again.');
  }

  await pool.query('update users set is_online = 1 where id = ?', [userId]);
  return toPublicUser({ ...user, is_online: 1 });
}

export async function listOtherUsers(userId: number): Promise<PublicUser[]> {
  const [rows] = await pool.query<UserRow[]>(
    `select id, name, email, password_hash, is_online
     FROM users
     where id <> ? and email is not null and email <> ''
     order by name asc`,
    [userId]
  );

  return rows.map((row) => toPublicUser(row));
}
