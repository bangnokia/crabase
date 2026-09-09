import { useEffect, useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import type { Account, Request } from "../types";
import { Dialog, ErrorNotice } from "./ui";
import { useAuth } from "./AuthGate";

export function SettingsDialog({ theme, setTheme, request, close }: {
  theme: string; setTheme: (theme: string) => void; request: Request; close: () => void;
}) {
  const { user, refresh, logout } = useAuth();
  const [page, setPage] = useState('profile');
  const [error, setError] = useState('');
  return <Dialog title="Settings" className="settings-dialog" close={close}>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings">
        <button aria-current={page === 'profile' ? 'page' : undefined} onClick={() => setPage('profile')}>Profile</button>
        <button aria-current={page === 'appearance' ? 'page' : undefined} onClick={() => setPage('appearance')}>Appearance</button>
        {!!user.admin && <><span className="settings-group">Admin</span>
          <button aria-current={page === 'users' ? 'page' : undefined} onClick={() => setPage('users')}>Users</button></>}
        <button className="settings-logout" onClick={() => void logout().catch(error => setError(error.message))}>Sign out</button>
      </nav>
      <section className="settings-content">
        <ErrorNotice message={error} />
        {page === 'profile' && <AccountForm account={user} save={async data => {
          await request('profileSave', data); await refresh();
        }} />}
        {page === 'appearance' && <><h2>Appearance</h2><div className="theme-options">
          {['light','dark'].map(value => <button key={value} aria-pressed={theme === value} onClick={() => setTheme(value)}>
            {value === 'light' ? <Sun size={18} /> : <Moon size={18} />}{value === 'light' ? 'Light' : 'Dark'}
            {theme === value && <Check size={16} />}
          </button>)}
        </div></>}
        {page === 'users' && !!user.admin && <UserManagement request={request} />}
      </section>
    </div>
  </Dialog>;
}

function AccountForm({ account, admin = false, save, cancel }: {
  account?: Account; admin?: boolean; save: (data: Record<string, unknown>) => Promise<void>; cancel?: () => void;
}) {
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  return <form className="account-form" onChange={() => setSaved(false)} onSubmit={async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const data: Record<string, unknown> = Object.fromEntries(fields);
    if (admin) { data.admin = fields.has('admin'); data.enabled = fields.has('enabled'); }
    if (account) data.id = account.id;
    setBusy(true); setError(''); setSaved(false);
    try {
      await save(data); setSaved(true);
      form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach(input => { input.value = ''; });
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }}>
    <h2>{admin ? account ? 'Edit user' : 'New user' : 'Profile'}</h2>
    <label>Display name<input name="name" defaultValue={account?.name} required maxLength={100} autoComplete="name" /></label>
    <label>Login email<input name="email" type="email" defaultValue={account?.email} required maxLength={254} autoComplete="username" /></label>
    {!admin && <>
      <label>Avatar URL<input name="avatar_url" type="url" defaultValue={account?.avatar_url} /></label>
      <label>Git author name <small>(optional)</small><input name="git_name" defaultValue={account?.git_name} maxLength={100} /></label>
      <label>Git author email <small>(optional)</small><input name="git_email" type="email" defaultValue={account?.git_email} maxLength={254} /></label>
      <p className="muted">Use your GitHub-verified or noreply email for commit credit. Leave it empty to omit co-author credit.</p>
      <label>Current password<input name="current_password" type="password" autoComplete="current-password" /></label>
      <p className="muted">Required only when changing your login email or password.</p>
    </>}
    <label>{account ? 'New password (leave blank to keep)' : 'Password'}<input name="password" type="password"
      autoComplete="new-password" minLength={6} maxLength={72} required={!account} /></label>
    {admin && <>
      <label className="check-label"><input name="admin" type="checkbox" defaultChecked={!!account?.admin} /> Administrator</label>
      {account && <label className="check-label"><input name="enabled" type="checkbox" defaultChecked={!!account.enabled} /> Account enabled</label>}
    </>}
    <ErrorNotice message={error} />
    {saved && <p role="status">Saved.</p>}
    <div className="dialog-actions">
      {cancel && <button type="button" className="button secondary" onClick={cancel}>Back</button>}
      <button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
  </form>;
}

function UserManagement({ request }: { request: Request }) {
  const [users, setUsers] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true); setError('');
    try { setUsers((await request<{ users: Account[] }>('usersList')).users); }
    catch (error) { setError((error as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [request]);
  if (editing) return <AccountForm key={editing === 'new' ? 'new' : editing.id} admin
    account={editing === 'new' ? undefined : editing} cancel={() => setEditing(null)} save={async data => {
      await request(editing === 'new' ? 'userCreate' : 'userUpdate', data);
      setEditing(null); await load();
    }} />;
  return <><div className="settings-users-heading"><h2>Users</h2><button className="button secondary" onClick={() => setEditing('new')}>Add user</button></div>
    <ErrorNotice message={error} />
    {error && <button className="text-button" onClick={() => void load()}>Retry</button>}
    {loading ? <p role="status">Loading users…</p> : <ul className="settings-users">
      {users.map(user => <li key={user.id}><button onClick={() => setEditing(user)}>
        <span><strong>{user.name}</strong><small>{user.email}</small></span>
        <small>{!user.enabled ? 'Disabled' : user.admin ? 'Admin' : 'Member'}</small>
      </button></li>)}
    </ul>}
  </>;
}
