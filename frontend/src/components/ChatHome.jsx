import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChat,
  getMessages,
  listenToMessages,
  listUsers,
  logout,
  markRead,
  sendMessage,
  updateLastSeen,
} from '../api';

const AVATAR_COLORS = ['#2563eb', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1'];

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function colorFor(name) {
  let total = 0;
  for (const char of name) total += char.charCodeAt(0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length];
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Avatar({ name }) {
  return (
    <span className="avatar" style={{ background: colorFor(name) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export default function ChatHome({ user, onLogout }) {
  const [people, setPeople] = useState([]);
  const [peopleError, setPeopleError] = useState('');
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [opening, setOpening] = useState(false);
  const [liveMessages, setLiveMessages] = useState([]);
  const [olderMessages, setOlderMessages] = useState([]);
  const [hasOlder, setHasOlder] = useState(null);
  const [streamReady, setStreamReady] = useState(false);
  const [chatError, setChatError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const stickToBottom = useRef(true);
  const markedRef = useRef(new Set());
  const lastSeenRef = useRef('');

  const messages = useMemo(() => {
    const liveIds = new Set(liveMessages.map((message) => message.messageId));
    return [...olderMessages.filter((message) => !liveIds.has(message.messageId)), ...liveMessages];
  }, [olderMessages, liveMessages]);

  useEffect(() => {
    let cancelled = false;

    async function loadPeople() {
      try {
        const data = await listUsers();
        if (!cancelled) {
          setPeople(data.users || []);
          setPeopleError('');
        }
      } catch (err) {
        if (!cancelled) {
          setPeopleError(err instanceof Error ? err.message : 'Could not load users');
        }
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    }

    loadPeople();
    const timer = setInterval(loadPeople, 12000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!chatId) return undefined;

    const controller = new AbortController();
    setStreamReady(false);
    setChatError('');
    stickToBottom.current = true;

    listenToMessages(chatId, (nextMessages) => {
      setLiveMessages(nextMessages);
      setStreamReady(true);
      setHasOlder((current) => (current === null ? nextMessages.length >= 50 : current));
    }, controller.signal)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setChatError(err instanceof Error ? err.message : 'Could not load messages');
      })
      .finally(() => {
        if (!controller.signal.aborted) setStreamReady(true);
      });

    return () => controller.abort();
  }, [chatId]);

  useEffect(() => {
    if (stickToBottom.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatId]);

  useEffect(() => {
    if (!chatId || !selected) return;

    for (const message of liveMessages) {
      const alreadyRead = message.readBy && message.readBy[String(user.id)];
      if (message.senderId === user.id || alreadyRead || markedRef.current.has(message.messageId)) {
        continue;
      }
      markedRef.current.add(message.messageId);
      markRead(chatId, message.messageId).catch(() => {
        markedRef.current.delete(message.messageId);
      });
    }

    const latest = liveMessages[liveMessages.length - 1];
    if (latest && lastSeenRef.current !== latest.messageId) {
      lastSeenRef.current = latest.messageId;
      updateLastSeen(chatId, latest.messageId).catch(() => {
        lastSeenRef.current = '';
      });
    }
  }, [liveMessages, chatId, selected, user.id]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      console.error('Could not logout');
    }
    onLogout();
  }

  async function openPerson(person) {
    setSelected(person);
    setChatId(null);
    setLiveMessages([]);
    setOlderMessages([]);
    setHasOlder(null);
    setText('');
    setChatError('');
    setStreamReady(false);
    setOpening(true);
    markedRef.current = new Set();
    lastSeenRef.current = '';
    stickToBottom.current = true;

    try {
      const data = await createChat(person.id);
      setChatId(data.chatId);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Could not open the chat');
    } finally {
      setOpening(false);
    }
  }

  async function handleLoadOlder() {
    if (!chatId || messages.length === 0) return;
    const before = messages[0].createdAt;
    if (!before) return;

    stickToBottom.current = false;
    try {
      const page = await getMessages(chatId, 50, before);
      setOlderMessages((current) => {
        const seen = new Set([...current, ...liveMessages].map((message) => message.messageId));
        const extra = (page.messages || []).filter((message) => !seen.has(message.messageId));
        return [...extra, ...current];
      });
      setHasOlder(Boolean(page.nextBefore));
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Could not load older messages');
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !chatId) return;

    setSending(true);
    setChatError('');
    stickToBottom.current = true;
    try {
      await sendMessage(chatId, trimmed);
      setText('');
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Could not send the message');
    } finally {
      setSending(false);
    }
  }

  const latestMineId = [...messages].reverse().find((message) => message.senderId === user.id)?.messageId;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="me">
          <Avatar name={user.name} />
          <div>
            <strong>{user.name}</strong>
            <p className="muted">{user.email}</p>
          </div>
        </div>
        <button type="button" className="ghost" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className={selected ? 'layout chat-open' : 'layout'}>
        <aside className="sidebar">
          <h2>People</h2>
          {peopleLoading && <p className="muted">Loading users...</p>}
          {peopleError && <p className="form-error">{peopleError}</p>}
          {!peopleLoading && !peopleError && people.length === 0 && (
            <p className="muted">No other users yet.</p>
          )}
          <ul className="people">
            {people.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  className={selected?.id === person.id ? 'person active' : 'person'}
                  onClick={() => openPerson(person)}
                >
                  <Avatar name={person.name} />
                  <span className="person-copy">
                    <strong>{person.name}</strong>
                    <span className={person.isOnline ? 'status on' : 'status'}>
                      {person.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="conversation">
          {!selected && <p className="empty">Choose a person to start a private chat.</p>}

          {selected && (
            <>
              <div className="conversation-head">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setSelected(null);
                    setChatId(null);
                    setLiveMessages([]);
                    setOlderMessages([]);
                  }}
                >
                  Back
                </button>
                <div className="peer">
                  <Avatar name={selected.name} />
                  <div>
                    <h2>{selected.name}</h2>
                    <p className={selected.isOnline ? 'status on' : 'status'}>
                      {selected.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>

              {chatError && <p className="form-error">{chatError}</p>}
              {(opening || (chatId && !streamReady)) && <p className="muted">Loading messages...</p>}

              <div className="messages">
                {hasOlder && (
                  <button type="button" className="older" onClick={handleLoadOlder}>
                    Load older messages
                  </button>
                )}
                {streamReady && !opening && messages.length === 0 && (
                  <p className="muted">No messages yet. Say hello.</p>
                )}
                {messages.map((message) => {
                  const mine = message.senderId === user.id;
                  const seen = mine && message.readBy && message.readBy[String(selected.id)];
                  return (
                    <article key={message.messageId} className={mine ? 'bubble mine' : 'bubble'}>
                      <p>{message.text || message.message}</p>
                      <p className="meta">
                        <time>{formatTime(message.createdAt)}</time>
                        {message.messageId === latestMineId && seen ? ' · Seen' : ''}
                      </p>
                    </article>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form className="composer" onSubmit={handleSend}>
                <label className="sr-only" htmlFor="messageText">
                  Message
                </label>
                <textarea
                  id="messageText"
                  rows={2}
                  value={text}
                  placeholder={`Message ${selected.name}`}
                  disabled={!chatId || sending}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button type="submit" disabled={!chatId || sending || text.trim() === ''}>
                  Send
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
