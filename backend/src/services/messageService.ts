import { admin, firestore } from '../config/firebase';
import type { ChatMessage, LastSeen, MessagePage, ReadReceipt } from '../types';
import { HttpError } from '../utils/httpError';
import { assertChatMember, getOtherMemberId } from './chatService';

function messagesCollection(chatId: number): FirebaseFirestore.CollectionReference {
  return firestore.collection('chats').doc(String(chatId)).collection('messages');
}

function lastSeenDocument(chatId: number, userId: number): FirebaseFirestore.DocumentReference {
  return firestore.collection('chats').doc(String(chatId)).collection('lastSeen').doc(String(userId));
}

function timestampToIso(value: unknown): string | null {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }
  return null;
}

function mapReadBy(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const readBy: Record<string, string> = {};
  for (const [userId, time] of Object.entries(value)) {
    const isoTime = timestampToIso(time);
    if (isoTime) {
      readBy[userId] = isoTime;
    }
  }
  return readBy;
}

function readInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function mapMessage(messageId: string, data: FirebaseFirestore.DocumentData): ChatMessage {
  const record = data as unknown as Record<string, unknown>;
  const senderId = readInt(record.senderId) ?? 0;
  const textFromText = typeof record.text === 'string' ? record.text : '';
  const textFromMessage = typeof record.message === 'string' ? record.message : '';
  const text = textFromText || textFromMessage;

  return {
    messageId,
    senderId,
    receiverId: readInt(record.receiverId),
    conversationId: readInt(record.conversationId),
    text,
    message: text,
    createdAt: timestampToIso(record.createdAt),
    readBy: mapReadBy(record.readBy),
  };
}

async function getMessageOrThrow(chatId: number, messageId: string): Promise<FirebaseFirestore.DocumentSnapshot> {
  const snapshot = await messagesCollection(chatId).doc(messageId).get();
  if (!snapshot.exists) {
    throw new HttpError(404, 'Message not found');
  }
  return snapshot;
}

export async function sendMessage(chatId: number, senderId: number, text: string): Promise<ChatMessage> {
  await assertChatMember(chatId, senderId);
  const receiverId = await getOtherMemberId(chatId, senderId);

  const messageRef = messagesCollection(chatId).doc();
  await messageRef.set({
    senderId,
    receiverId,
    conversationId: chatId,
    text,
    message: text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    readBy: {
      [String(senderId)]: admin.firestore.FieldValue.serverTimestamp(),
    },
  });

  const saved = await messageRef.get();
  const data = saved.data();
  if (!data) {
    throw new HttpError(500, 'Could not save the message');
  }

  return mapMessage(saved.id, data);
}

export async function getMessages(
  chatId: number,
  userId: number,
  limit: number,
  before: Date | null
): Promise<MessagePage> {
  await assertChatMember(chatId, userId);

  let query: FirebaseFirestore.Query = messagesCollection(chatId).orderBy('createdAt', 'desc');
  if (before) {
    query = query.where('createdAt', '<', admin.firestore.Timestamp.fromDate(before));
  }

  const snap = await query.limit(limit).get();
  // Newest page is fetched first, then reversed so the API returns oldest -> newest.
  const messages = snap.docs.map((doc) => mapMessage(doc.id, doc.data())).reverse();
  const oldest = messages[0];
  const nextBefore = messages.length === limit && oldest?.createdAt ? oldest.createdAt : null;

  return { messages, nextBefore };
}

export async function markMessageRead(
  chatId: number,
  messageId: string,
  userId: number
): Promise<ReadReceipt> {
  await assertChatMember(chatId, userId);
  const messageRef = (await getMessageOrThrow(chatId, messageId)).ref;

  await messageRef.update({
    [`readBy.${userId}`]: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updated = await messageRef.get();
  const data = updated.data();
  const readBy = mapReadBy(data ? (data as unknown as Record<string, unknown>).readBy : undefined);
  const readAt = readBy[String(userId)];
  if (!readAt) {
    throw new HttpError(500, 'Could not save the read receipt');
  }

  return { chatId, messageId, userId, readAt };
}

export async function updateLastSeen(
  chatId: number,
  userId: number,
  messageId: string
): Promise<LastSeen> {
  await assertChatMember(chatId, userId);
  await getMessageOrThrow(chatId, messageId);

  const ref = lastSeenDocument(chatId, userId);
  await ref.set(
    {
      messageId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const saved = await ref.get();
  const raw = saved.data() as unknown as Record<string, unknown> | undefined;
  const updatedAt = timestampToIso(raw?.updatedAt);
  if (!updatedAt) {
    throw new HttpError(500, 'Could not save the last seen message');
  }

  return { chatId, userId, messageId, updatedAt };
}

export function watchLatestMessages(
  chatId: number,
  onMessages: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void
): () => void {
  const query = messagesCollection(chatId).orderBy('createdAt', 'desc').limit(50);

  return query.onSnapshot(
    (snap) => {
      const messages = snap.docs.map((doc) => mapMessage(doc.id, doc.data())).reverse();
      onMessages(messages);
    },
    (error) => {
      onError(error);
    }
  );
}
