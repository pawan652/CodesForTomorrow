export type ChatSummary = {
  chatId: number;
  memberIds: number[];
};

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  isOnline: boolean;
};

export type ChatMessage = {
  messageId: string;
  senderId: number;
  receiverId: number | null;
  conversationId: number | null;
  text: string;
  message: string;
  createdAt: string | null;
  readBy: Record<string, string>;
};

export type MessagePage = {
  messages: ChatMessage[];
  nextBefore: string | null;
};

export type ReadReceipt = {
  chatId: number;
  messageId: string;
  userId: number;
  readAt: string;
};

export type LastSeen = {
  chatId: number;
  userId: number;
  messageId: string;
  updatedAt: string;
};
