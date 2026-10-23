const MYSQL_SIGNED_INT_MAX = 2147483647;

export function readPositiveInt(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1 || value > MYSQL_SIGNED_INT_MAX) {
      return null;
    }
    return value;
  }

  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed > MYSQL_SIGNED_INT_MAX) {
      return null;
    }
    return parsed;
  }

  return null;
}

export function readEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const email = value.trim().toLowerCase();
  if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return email;
}

export function readMessageId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const messageId = value.trim();
  if (
    messageId.length === 0 ||
    messageId.length > 200 ||
    messageId === '.' ||
    messageId === '..' ||
    messageId.includes('/')
  ) {
    return null;
  }

  return messageId;
}
