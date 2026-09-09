import { useState } from 'react';
import type { Project, Request } from '../types';
import { Dialog, ErrorNotice } from './ui';

export function WorktreeDialog({ project, request, added, close }: {
  project: Project; request: Request; added: (id: string) => void; close: () => void;
}) {
  const [branch, setBranch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Dialog title="Create worktree" close={() => { if (!busy) close(); }}>
    <form className="account-form" onSubmit={async event => {
      event.preventDefault();
      if (busy) return;
      setBusy(true); setError('');
      try { const result = await request<{ id: string }>('worktreeCreate', { project_id: project.id, branch }); added(result.id); }
      catch (error) { setError((error as Error).message); }
      finally { setBusy(false); }
    }}>
      <p className="muted">Create a new branch from {project.name}’s current commit. Uncommitted files, .env and dependencies aren’t copied unless tracked by Git.</p>
      <label>New branch<input autoFocus required maxLength={160} placeholder="feature/login" value={branch} disabled={busy} onChange={event => setBranch(event.target.value)} /></label>
      <ErrorNotice message={error} />
      <div className="dialog-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={close}>Cancel</button>
        <button className="button primary" disabled={busy || !branch.trim()}>{busy ? 'Creating…' : 'Create worktree'}</button>
      </div>
    </form>
  </Dialog>;
}
