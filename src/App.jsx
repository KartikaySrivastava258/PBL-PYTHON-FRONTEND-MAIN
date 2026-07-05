import React, { useState, useEffect } from 'react';
import {
  Mail, Lock, LogIn, Sun, Moon, ShieldCheck, WifiOff, LogOut,
  UserCheck, Eye, EyeOff, MessageSquare, Sparkles,
} from 'lucide-react';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/AdminDashboard';
import { BACKEND_BASE_URL, decodeJwtToken, sendRequest, isTokenExpired } from './lib/api';

const LOGIN_URL = `${BACKEND_BASE_URL}/login`;

const runtimeStyle = `
:root{
  --discord-blurple:#5865F2;
  --discord-blurple-2:#404EED;
  --bg-deep:#0f1226;
  --bg-mid:#0b0d16;
  --card:#0f1724;
  --muted:#99AAB5;
  --label:#B9BBBE;
  --white:#FFFFFF;
  --danger:#ff6b6b;
  --success:#3ad29f;
  --glass: rgba(255,255,255,0.03);
  --glass-2: rgba(255,255,255,0.02);
  --shadow: 0 8px 30px rgba(2,6,23,0.6);
  --radius: 14px;
  --transition: 0.28s;
}
`;

// Main App
export default function App() {
  // Page routing state: 'login' | 'home' | 'chat' | 'admin'
  const [page, setPage] = useState('login');

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [userData, setUserData] = useState(() => {
    const s = localStorage.getItem('user_data');
    return s ? JSON.parse(s) : null;
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.body.className = isDarkMode ? 'discord-dark' : 'discord-light';
  }, [isDarkMode]);

  // On mount: if we already have a valid session, skip the login screen.
  useEffect(() => {
    if (token && userData && !isTokenExpired(userData)) {
      setPage('home');
    } else if (token) {
      // stale/expired token
      handleLogout(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDarkMode = () => setIsDarkMode((p) => !p);

  const handleLogout = (showMsg = true) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setToken(null);
    setUserData(null);
    setPage('login');
    if (showMsg) setMessage('Logged out. Token and user data cleared.');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setMessage('Signing in...');

    try {
      const data = await sendRequest(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      });

      const newAccessToken = data.access_token || data.token;
      if (!newAccessToken) throw new Error("Login succeeded but no token was returned.");

      const decodedData = decodeJwtToken(newAccessToken);
      if (!decodedData) throw new Error('Token received but could not be parsed.');

      localStorage.setItem('access_token', newAccessToken);
      localStorage.setItem('user_data', JSON.stringify(decodedData));
      setToken(newAccessToken);
      setUserData(decodedData);
      setMessage(`Welcome back, ${decodedData.username || decodedData.role}!`);
      setUsername('');
      setPassword('');
      setPage('home');
    } catch (error) {
      setMessage(`Login failed: ${error.message}`);
      setToken(null);
      setUserData(null);
    } finally {
      setLoggingIn(false);
    }
  };

  const getMessageClass = () => {
    if (message && (message.includes('failed') || message.includes('ERROR') || message.includes('Error'))) return 'bg-danger';
    if (message && (message.includes('Welcome') || message.includes('success') || message.includes('Logged out'))) return 'bg-success';
    return 'bg-default';
  };

  if (page === 'chat') {
    return (
      <ChatPage
        userData={userData}
        token={token}
        onLogout={() => handleLogout()}
        onBack={() => setPage('home')}
        onOpenAdmin={() => setPage('admin')}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  if (page === 'admin') {
    return (
      <AdminDashboard
        userData={userData}
        token={token}
        onLogout={() => handleLogout()}
        onBack={() => setPage('home')}
        onOpenChat={() => setPage('chat')}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  return (
    <>
      <style>{runtimeStyle}</style>

      <div className="app-root">
        <div className="page-bg" aria-hidden="true" />

        <main className="center-wrap">
          <section className="login-card" role="region" aria-labelledby="welcome-heading">
            <header className="card-header">
              <div className="brand">
                <ShieldCheck className="brand-icon" />
                <div>
                  <h1 id="welcome-heading" className="title">
                    {token ? 'Welcome back!' : 'Sign in to Nexus'}
                  </h1>
                  <p className="subtitle">
                    {token ? 'Pick up right where you left off.' : 'Your team, your channels, all in one place.'}
                  </p>
                </div>
              </div>

              <button onClick={toggleDarkMode} aria-pressed={isDarkMode} title="Toggle light/dark" className="theme-toggle">
                {isDarkMode ? <Sun className="icon" /> : <Moon className="icon" />}
              </button>
            </header>

            {!token && (
              <form className="form-area" onSubmit={handleLogin} noValidate>
                <label className="visually-hidden" htmlFor="email">Email</label>
                <div className="field">
                  <Mail className="field-icon" />
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="input"
                    aria-label="Email"
                    autoComplete="username"
                  />
                </div>

                <label className="visually-hidden" htmlFor="password">Password</label>
                <div className="field">
                  <Lock className="field-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input"
                    aria-label="Password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff className="icon-small" /> : <Eye className="icon-small" />}
                  </button>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loggingIn}>
                    <LogIn className="btn-icon" /> {loggingIn ? 'Signing in...' : 'Log In'}
                  </button>
                </div>
              </form>
            )}

            <div className={`message ${getMessageClass()}`} role="status" aria-live="polite">
              <h3 className="msg-title">
                {message && message.includes('reach the server') && <WifiOff className="mini" />}
                Status
              </h3>
              <p className="msg-body">{message || (token ? 'Session active.' : 'Enter your credentials to log in.')}</p>
            </div>

            {token && (
              <div className="session-panel card" aria-live="polite">
                <div className="session-header">
                  <ShieldCheck className="session-icon" />
                  <div>
                    <h2 className="session-title">Session Active</h2>
                    <p className="session-sub">You're authenticated. Where would you like to go?</p>
                  </div>
                </div>
                <div className="session-actions">
                  <button onClick={() => setPage('chat')} className="btn-primary">
                    <MessageSquare className="btn-icon" /> Go to Chat
                  </button>
                  {userData && userData.role === 'sys_admin' && (
                    <button onClick={() => setPage('admin')} className="btn-primary">
                      <ShieldCheck className="btn-icon" /> Admin Dashboard
                    </button>
                  )}
                  <button onClick={() => handleLogout()} className="btn-primary">
                    <LogOut className="btn-icon" /> Log Out
                  </button>
                </div>
                {userData && (
                  <div className="session-user card">
                    <h4 className="session-user-title"><UserCheck className="mini" /> Signed in as</h4>
                    <div className="session-user-body">
                      <p><span className="key">username:</span> <span className="val">{userData.username}</span></p>
                      <p><span className="key">role:</span> <span className="val">{userData.role}</span></p>
                      <p><span className="key">user id:</span> <span className="val">{userData.sub}</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!token && (
              <div className="form-links" style={{ marginTop: 8 }}>
                <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <Sparkles size={14} /> Ask your administrator for an account.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
