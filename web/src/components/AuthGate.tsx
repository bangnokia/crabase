import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Account } from "../types";
import { ErrorNotice } from "./ui";

const AuthContext = createContext<{ user: Account; refresh: () => Promise<void>; logout: () => Promise<void> } | null>(null);
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("Authentication required.");
  return auth;
}
export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauth, setOauth] = useState(false);
  const [passwordLogin, setPasswordLogin] = useState(false);
  const [avatarCheck, setAvatarCheck] = useState<{ id: string; source: string; available: boolean } | null>(null);
  const avatarSource = user?.avatar_url || user?.avatar_fallback || '';
  useEffect(() => {
    if (!user) return;
    let stale = false;
    const image = new Image();
    const finish = (available: boolean) => {
      if (!stale) setAvatarCheck({ id: user.id, source: avatarSource, available });
    };
    const timer = setTimeout(() => finish(false), 8000);
    image.onload = () => { clearTimeout(timer); finish(image.naturalWidth > 0); };
    image.onerror = () => { clearTimeout(timer); finish(false); };
    if (avatarSource) image.src = avatarSource;
    else finish(false);
    return () => { stale = true; clearTimeout(timer); image.onload = image.onerror = null; };
  }, [user?.id, avatarSource]);
  async function refresh() {
    const response = await fetch('/auth/session', { credentials: 'same-origin' });
    if (!response.ok && response.status !== 401) throw new Error('Unable to check your session.');
    const result = await response.json();
    setOauth(!!result.oauth);
    setUser(result.user);
  }
  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem('crabase.theme') === 'dark' ? 'dark' : 'light';
    void refresh().catch(error => setError(error.message)).finally(() => setLoaded(true));
    const expired = () => setUser(null);
    window.addEventListener('crabase:unauthorized', expired);
    return () => window.removeEventListener('crabase:unauthorized', expired);
  }, []);
  async function logout() {
    const response = await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
    if (!response.ok) throw new Error('Unable to sign out. Try again.');
    setUser(null);
    setPasswordLogin(false);
  }
  if (!loaded) return <div className="login-page" role="status">Loading…</div>;
  if (user) {
    if (avatarCheck?.id !== user.id || avatarCheck.source !== avatarSource) return <div className="login-page" role="status">Checking profile…</div>;
    return <AuthContext.Provider value={{ user: { ...user, avatar_required: !avatarCheck.available }, refresh, logout }}>{children}</AuthContext.Provider>;
  }
  return <main className="login-page"><form className="login-form" onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const response = await fetch('/auth/login', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
      setUser(result.user);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }}>
    <h1>Sign in to Crabase</h1>
    {oauth && <a className="button primary" href="http://127.0.0.1:8787/auth/oauth/start">Sign in with TDA</a>}
    {oauth && <button type="button" className="text-button" aria-expanded={passwordLogin} aria-controls="password-login" onClick={() => { setPasswordLogin(!passwordLogin); setError(''); }}>
      {passwordLogin ? 'Hide email and password' : 'Use email and password'}
    </button>}
    {(!oauth || passwordLogin) && <div id="password-login" className="login-form">
    <label>Email<input name="email" type="email" autoComplete="username" required autoFocus /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    <button className={`button ${oauth ? 'secondary' : 'primary'}`} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </div>}
    <ErrorNotice message={error} />
  </form></main>;
}
