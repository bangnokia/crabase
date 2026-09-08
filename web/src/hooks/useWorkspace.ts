import { useCallback, useEffect, useRef, useState } from "react";
import type { Snapshot, Message, Approval, Artifact } from "../types";
import { applyMessagePatch } from "../lib/messages";
const empty: Snapshot = {
  agentName: "Crab",
  models: [],
  projects: [],
  chats: [],
  events: [],
  runtime: "offline",
};
export function useWorkspace(selected: string) {
  const [data, setData] = useState<Snapshot>(empty);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [error, setError] = useState("");
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const socketRef = useRef<WebSocket | null>(null);
  const sequence = useRef(0);
  const pending = useRef(
    new Map<
      number,
      {
        resolve: (data: unknown) => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  const request = useCallback(
    <T = unknown>(action: string, data: unknown = {}): Promise<T> => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN)
        return Promise.reject(
          new Error(
            "Workspace disconnected. Wait for reconnection before sending.",
          ),
        );
      const id = ++sequence.current;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.current.delete(id);
          reject(
            new Error(
              "Confirmation timed out. Check the chat before retrying; your action may have been saved.",
            ),
          );
          socket.close();
        }, 15000);
        pending.current.set(id, {
          resolve: (result) => resolve(result as T),
          reject,
          timer,
        });
        socket.send(JSON.stringify({ id, action, data }));
      });
    },
    [],
  );
  useEffect(() => {
    let retry: ReturnType<typeof setTimeout>,
      disposed = false;
    const rejectPending = () => {
      for (const entry of pending.current.values()) {
        clearTimeout(entry.timer);
        entry.reject(
          new Error(
            "Connection lost before confirmation. Check the chat after reconnecting before retrying.",
          ),
        );
      }
      pending.current.clear();
    };
    function connect() {
      const endpoint =
        location.port === "5173"
          ? `${location.host}/live`
          : `${location.hostname}:8788`;
      const socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${endpoint}`,
      );
      socketRef.current = socket;
      socket.onopen = () => {
        if (!disposed) setLive(true);
      };
      socket.onmessage = (event) => {
        if (disposed) return;
        const packet = JSON.parse(event.data);
        if (typeof packet.id === "number") {
          const entry = pending.current.get(packet.id);
          if (!entry) return;
          clearTimeout(entry.timer);
          pending.current.delete(packet.id);
          if (packet.error) entry.reject(new Error(packet.error));
          else entry.resolve(packet.result);
          return;
        }
        if (packet.type !== "patch") return;
        if (packet.state)
          setData((previous) => ({ ...previous, ...packet.state }));
        if (packet.chat_id === selectedRef.current) {
          if (packet.messages || packet.append)
            setMessages((previous) =>
              applyMessagePatch(previous, packet.messages, packet.append),
            );
          if (packet.artifacts) setArtifacts(packet.artifacts);
          if (packet.approvals) setApprovals(packet.approvals);
        }
      };
      socket.onclose = () => {
        if (disposed || socketRef.current !== socket) return;
        setLive(false);
        rejectPending();
        retry = setTimeout(connect, 1000);
      };
    }
    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      rejectPending();
      socketRef.current?.close();
    };
  }, []);
  useEffect(() => {
    setMessages([]);
    setApprovals([]);
    setArtifacts([]);
    setLoaded(false);
    if (!live) return;
    const id = selected;
    let stale = false;
    request<{
      state: Snapshot;
      thread: {
        artifacts: Artifact[];
        messages: Message[];
        approvals: Approval[];
      } | null;
    }>("sync", { chat_id: id || null })
      .then((result) => {
        if (stale) return;
        setData(result.state);
        setLoaded(true);
        setArtifacts(result.thread?.artifacts || []);
        setMessages(result.thread?.messages || []);
        setApprovals(result.thread?.approvals || []);
      })
      .catch((error) => {
        if (!stale) setError(error.message);
      });
    return () => {
      stale = true;
    };
  }, [selected, live, request]);

  return {
    data,
    loaded,
    live,
    messages,
    approvals,
    artifacts,
    error,
    setError,
    request,
  };
}
