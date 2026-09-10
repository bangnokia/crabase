import { useEffect, useRef, useState } from 'react';
import type { Artifact, Request } from '../types';

export type PendingAttachment = Artifact & {
  key: string;
  file: File;
  id?: string;
  progress: number;
  error?: string;
  cancelled?: boolean;
};

export function useAttachments(request: Request, draftVersion: number, context: string) {
  const entries = useRef<PendingAttachment[]>([]);
  const nextKey = useRef(0);
  const [files, setFiles] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState('');
  const refresh = () => setFiles([...entries.current]);
  function discard(file: PendingAttachment) {
    file.cancelled = true;
    URL.revokeObjectURL(file.url);
    if (file.id) void request('uploadRemove', { id: file.id }).catch(() => {});
  }
  function clear() {
    entries.current.forEach(discard);
    entries.current = [];
    setError('');
    refresh();
  }
  useEffect(() => { clear(); }, [draftVersion, context]);
  useEffect(() => () => { entries.current.forEach(discard); entries.current = []; }, []);

  async function upload(file: PendingAttachment) {
    file.error = undefined;
    file.progress = 0;
    refresh();
    try {
      if (file.id) await request('uploadRemove', { id: file.id }).catch(() => {});
      const result = await request<{ id: string }>('uploadStart', { name: file.name, size: file.size });
      file.id = result.id;
      if (file.cancelled) { discard(file); return; }
      // Small chunks keep typing and terminal traffic responsive on the shared socket.
      for (let offset = 0; offset < file.size; offset += 49152) {
        const buffer = new Uint8Array(await file.file.slice(offset, offset + 49152).arrayBuffer());
        if (file.cancelled) return;
        const bytes = btoa(String.fromCharCode(...buffer));
        const chunk = await request<{ received: number; mime: string | null }>('uploadChunk', { id: file.id, offset, bytes });
        if (file.cancelled) return;
        file.progress = Math.floor(chunk.received / file.size * 100);
        if (chunk.mime) file.mime = chunk.mime;
        refresh();
      }
    } catch (cause) {
      if (!file.cancelled) { file.error = (cause as Error).message; refresh(); }
    }
  }
  function add(incoming: File[]) {
    setError('');
    for (const file of incoming) {
      if (entries.current.length >= 10) { setError('Attach at most 10 files.'); break; }
      if (!file.size || file.size > 5 * 1024 * 1024) { setError(`${file.name}: files must be between 1 byte and 5 MB.`); continue; }
      const entry: PendingAttachment = { key: String(++nextKey.current), file, name: file.name, size: file.size, mime: file.type, url: URL.createObjectURL(file), progress: 0 };
      entries.current.push(entry);
      void upload(entry);
    }
    refresh();
  }
  function remove(file: PendingAttachment) {
    discard(file);
    entries.current = entries.current.filter(entry => entry !== file);
    refresh();
  }
  return { files, error, add, remove, retry: upload, clear,
    ready: files.every(file => file.progress === 100 && !file.error),
    ids: () => entries.current.map(file => file.id!),
  };
}
