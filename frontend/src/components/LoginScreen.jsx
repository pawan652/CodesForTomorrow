import { useState } from 'react';
import { login } from '../api';

function validate(email, password) {
  if (!email.trim() || !password) {
    return 'Email and password are required.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Enter a valid email address.';
  }
  return '';
}

export default function LoginScreen({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, isLaoding] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validate(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    isLaoding(true);
    setError('');
    try {
      const data = await login(email.trim(), password);
      onSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      isLaoding(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Chat</h1>
        <p className="muted">Sign in to see your conversations.</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </main>
  );
}
