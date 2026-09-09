export type Project = {
  id: string;
  name: string;
  path: string;
  created_order: number;
};
export type Chat = {
  id: string;
  project_id: string | null;
  title: string;
  status: string;
  archived: number;
  updated_at: string;
  project_name: string | null;
  participants?: string[];
};
export type Message = {
  id: number;
  role: string;
  author: string;
  body: string;
  created_at: string;
};
export type Approval = { id: number; method: string; details: string };
export type Event = {
  id: number;
  chat_id: string;
  label: string;
  title: string;
  created_at: string;
};
export type CodexModel = {
  model: string;
  displayName: string;
  isDefault: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: { reasoningEffort: string; description: string }[];
};
export type User = {
  id: string;
  name: string;
  avatar_url: string;
  created_at: string;
};
export type Snapshot = {
  users: User[];
  agentName: string;
  models: CodexModel[];
  projects: Project[];
  chats: Chat[];
  events: Event[];
  runtime: string;
};

export type Request = <T = unknown>(
  action: string,
  data?: unknown,
) => Promise<T>;
export type Avatars = Record<string, string>;

export type Artifact = {
  name: string;
  url: string;
  mime: string;
  size: number;
};

export type TerminalSession = {
  id: string;
  chat_id: string;
  title: string;
  output: string;
  running: boolean;
};

export type WorkspaceChange = {
  path: string;
  status: "added" | "deleted" | "modified" | "renamed" | "untracked";
  code: string;
};

export type ProjectWorkspace = {
  paths: string[];
  git: boolean;
  branch: string | null;
  changes: WorkspaceChange[];
};
