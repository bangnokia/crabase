import { useEffect, useState } from 'react';
import type { Account, Project, Request } from '../types';
import { Dialog, ErrorNotice } from './ui';

export function ProjectSharingDialog({ project, request, close }: { project: Project; request: Request; close: () => void }) {
  const [visibility, setVisibility] = useState('private');
  const [members, setMembers] = useState<string[]>([]);
  const [users, setUsers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let stale = false;
    Promise.all([request<{ visibility: string; members: string[] }>('projectSharing', { project_id: project.id }), request<{ users: Account[] }>('usersList')])
      .then(([sharing, accounts]) => {
        if (stale) return;
        setVisibility(sharing.visibility); setMembers(sharing.members.filter(id => accounts.users.some(user => user.id === id && user.enabled)));
        setUsers(accounts.users.filter(user => user.enabled && !user.admin)); setLoading(false);
      }).catch(error => { if (!stale) setError(error.message); });
    return () => { stale = true; };
  }, [project.id, request]);
  return <Dialog className="project-sharing-dialog" title={`Sharing · ${project.name}`} close={() => { if (!busy) close(); }}>
    <form className="account-form" onSubmit={async event => {
      event.preventDefault(); if (loading || busy) return;
      setBusy(true); setError('');
      try { await request('projectSharingSave', { project_id: project.id, visibility, members }); close(); }
      catch (error) { setError((error as Error).message); }
      finally { setBusy(false); }
    }}>
      <ErrorNotice message={error} />
      {loading ? !error && <p role="status">Loading sharing settings…</p> : <>
        <fieldset className="project-sharing-visibility" disabled={busy}>
          <legend>Visibility</legend>
          <label className="check-label"><input type="radio" name="visibility" value="private" checked={visibility === 'private'} onChange={() => setVisibility('private')} />Private</label>
          <label className="check-label"><input type="radio" name="visibility" value="public" checked={visibility === 'public'} onChange={() => setVisibility('public')} />Public · all signed-in users</label>
        </fieldset>
        <p className="muted">Admins always have access. Chats, files and worktrees inherit these settings.</p>
        {visibility === 'private' && <div className="project-sharing-users" role="group" aria-label="Share with users">
          {users.map(user => <label className="check-label" key={user.id}>
            <input type="checkbox" disabled={busy} checked={members.includes(user.id)} onChange={event => setMembers(current => event.target.checked ? [...current, user.id] : current.filter(id => id !== user.id))} />
            <span>{user.name}<small className="muted">{user.email}</small></span>
          </label>)}
          {!users.length && <p className="muted">No enabled members to share with.</p>}
        </div>}
      </>}
      <div className="dialog-actions"><button type="button" className="button secondary" disabled={busy} onClick={close}>Cancel</button>
        <button className="button primary" disabled={loading || busy}>{busy ? 'Saving…' : 'Save'}</button></div>
    </form>
  </Dialog>;
}
