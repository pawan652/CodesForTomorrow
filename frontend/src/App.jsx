import { useEffect, useState } from 'react';
import { currentUser } from './api';
import ChatHome from './components/ChatHome';
import LoginScreen from './components/LoginScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    currentUser()
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });

    function handleExpired() {
      setUser(null);
    }

    window.addEventListener('auth:expired', handleExpired);
    return () => {
      cancelled = true;
      window.removeEventListener('auth:expired', handleExpired);
    };
  }, []);

  if (booting) {
    return <p className="boot">Loading...</p>;
  }

  if (!user) {
    return <LoginScreen onSuccess={setUser} />;
  }

  return <ChatHome user={user} onLogout={() => setUser(null)} />;
}
