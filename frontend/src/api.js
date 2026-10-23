export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Cannot reach the API. Start the backend and check VITE_API_URL.');
  }

  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== '/auth/login') {
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export function currentUser() {
  return request('/auth/me');
}

export function listUsers() {
  return request('/users');
}

export function createChat(userId) {
  return request('/chat/create', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function getMessages(chatId, limit = 50, before) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  return request(`/chat/${chatId}/messages?${params.toString()}`);
}

export function sendMessage(chatId, text) {
  return request(`/chat/${chatId}/message/send`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function markRead(chatId, messageId) {
  return request(`/chat/${chatId}/message/${encodeURIComponent(messageId)}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function updateLastSeen(chatId, messageId) {
  return request(`/chat/${chatId}/lastseen`, {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  });
}

export async function listenToMessages(chatId, onMessages, signal) {
  const response = await fetch(`${API_URL}/chat/${chatId}/stream`, {
    credentials: 'include',
    signal,
  });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new Error('Please log in again.');
  }

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not open the chat');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const dataLine = part.split('\n').find((line) => line.startsWith('data: '));
      if (!dataLine) continue;

      const payload = JSON.parse(dataLine.slice(6));
      if (part.startsWith('event: error')) {
        throw new Error(payload.error || 'Could not listen for messages');
      }
      if (Array.isArray(payload.messages)) {
        onMessages(payload.messages);
      }
    }
  }
}
