import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { firestore } from '../config/firebase';
import { pool } from '../config/db';
import type { ChatSummary } from '../types';
import { HttpError } from '../utils/httpError';

type IdRow = RowDataPacket & { id: number };
type MemberRow = RowDataPacket & { chat_id: number; user_id: number };

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'ER_DUP_ENTRY'
  );
}

async function saveChatMembers(chatId: number, memberIds: number[]): Promise<void> {
  await firestore.collection('chats').doc(String(chatId)).set(
    { memberIds: memberIds.map((id) => String(id)) },
    { merge: true }
  );
}

async function findChatIdByPair(lowId: number, highId: number): Promise<number | null> {
  const [rows] = await pool.query<IdRow[]>(
    'select id from chats where user_low_id = ? and user_high_id = ? limit 1',
    [lowId, highId]
  );
  return rows[0]?.id ?? null;
}

export async function createOrGetChat(
  userAId: number,
  userBId: number
): Promise<{ chatId: number; created: boolean }> {
  // Store the smaller id first so the unique pair cannot be inserted twice.
  const lowId = Math.min(userAId, userBId);
  const highId = Math.max(userAId, userBId);

  const [userRows] = await pool.query<IdRow[]>(
    'select id from users where id in (?, ?)',
    [lowId, highId]
  );
  if (userRows.length !== 2) {
    throw new HttpError(404, 'One or both users were not found');
  }

  const existingChatId = await findChatIdByPair(lowId, highId);
  if (existingChatId !== null) {
    await saveChatMembers(existingChatId, [lowId, highId]);
    return { chatId: existingChatId, created: false };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [insertResult] = await connection.query<ResultSetHeader>(
      'insert into chats (user_low_id, user_high_id) values (?, ?)',
      [lowId, highId]
    );
    const chatId = insertResult.insertId;

    await connection.query(
      'insert into chat_members (chat_id, user_id) values (?, ?), (?, ?)',
      [chatId, lowId, chatId, highId]
    );

    await connection.commit();
    await saveChatMembers(chatId, [lowId, highId]);
    return { chatId, created: true };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Rollback failed', rollbackError);
    }

    if (isDuplicateKeyError(error)) {
      const chatId = await findChatIdByPair(lowId, highId);
      if (chatId !== null) {
        await saveChatMembers(chatId, [lowId, highId]);
        return { chatId, created: false };
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

export async function listUserChats(userId: number): Promise<ChatSummary[]> {
  const [userRows] = await pool.query<IdRow[]>(
    'select id from users where id = ? limit 1',
    [userId]
  );
  if (userRows.length === 0) {
    throw new HttpError(404, 'User not found');
  }

  const [rows] = await pool.query<MemberRow[]>(
    `select cm.chat_id, cm.user_id
     from chat_members as mine
     INNER JOIN chat_members AS cm ON cm.chat_id = mine.chat_id
     where mine.user_id = ?
     order by cm.chat_id desc, cm.user_id asc`,
    [userId]
  );

  const chats: ChatSummary[] = [];
  for (const row of rows) {
    const lastChat = chats[chats.length - 1];
    if (!lastChat || lastChat.chatId !== row.chat_id) {
      chats.push({ chatId: row.chat_id, memberIds: [row.user_id] });
    } else {
      lastChat.memberIds.push(row.user_id);
    }
  }

  return chats;
}

export async function getOtherMemberId(chatId: number, userId: number): Promise<number> {
  const [rows] = await pool.query<IdRow[]>(
    'select user_id as id from chat_members where chat_id = ? and user_id <> ? limit 1',
    [chatId, userId]
  );
  const otherUser = rows[0];
  if (!otherUser) {
    throw new HttpError(404, 'Chat not found');
  }
  return otherUser.id;
}

export async function assertChatMember(chatId: number, userId: number): Promise<void> {
  const [chatRows] = await pool.query<IdRow[]>(
    'select id from chats where id = ? limit 1',
    [chatId]
  );
  if (chatRows.length === 0) {
    throw new HttpError(404, 'Chat not found');
  }

  const [memberRows] = await pool.query<IdRow[]>(
    'select id from chat_members where chat_id = ? and user_id = ? limit 1',
    [chatId, userId]
  );
  if (memberRows.length === 0) {
    throw new HttpError(403, 'User is not a member of this chat');
  }
}
