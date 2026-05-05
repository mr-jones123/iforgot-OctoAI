import { ReactNode, useState } from "react";
import { CreateFirstSessionScreen } from "../utils/CreateFirstSessionScreen";

interface Session {
  id: string;
  name: string;
}

interface WorkspaceGateProps {
  children: (ctx: {
    sessions: Session[];
    activeSessionId?: string;
    setActiveSessionId: (id: string) => void;
    createSession: (session: Session) => void;
  }) => React.ReactNode;
}

export function WorkspaceGate({ children }: WorkspaceGateProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>();

  function createSession(session: Session) {
    setSessions((prev) => [...prev, session]);
    setActiveSessionId(session.id);
  }

  if (sessions.length === 0) {
    return (
      <CreateFirstSessionScreen
        onCreate={(session) => createSession(session)}
      />
    );
  }

  return children({
    sessions,
    activeSessionId,
    setActiveSessionId,
    createSession,
  });
}
