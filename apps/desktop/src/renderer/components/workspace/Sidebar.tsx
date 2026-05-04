/**
 * Sidebar — left rail navigation (240px fixed).
 */
import type { Workspace } from "@riza/shared";
import { useState } from "react";
import { SessionsCardModal } from "../sessions/SessionsCardModal";

interface Session {
  id: string;
  name: string;
}

interface SidebarProps {
  workspace: Workspace;
  sessions: Session[]; // ✅ controlled from outside
  activeSessionId?: string;
  onSelectSession?: (session: Session) => void;
  onCreateSession?: (session: Session) => void;
}

export function Sidebar({
  workspace,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
}: SidebarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  function createSession(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const newSession: Session = {
      id: crypto.randomUUID(),
      name: trimmed,
    };

    // ❌ no local setSessions
    // ✅ delegate upward
    onCreateSession?.(newSession);

    setNewSessionName("");
    setIsModalOpen(false);
  }

  return (
    <aside className="w-[240px] shrink-0 flex flex-col border-r border-surface-border min-h-[100dvh] px-4 py-5 gap-6">
      {/* Wordmark */}
      <div>
        <span className="text-sm font-semibold tracking-tighter text-text-primary">
          Riza
        </span>
      </div>

      {/* Workspace info */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-tertiary font-mono uppercase tracking-widest">
          Workspace
        </span>
        <span className="text-sm font-medium text-text-primary truncate">
          {workspace.name}
        </span>
        <span className="text-[11px] text-text-tertiary font-mono truncate">
          {workspace.repoPath}
        </span>
      </div>

      {/* Sessions Section */}
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-tertiary font-mono uppercase tracking-widest">
            Sessions
          </span>

          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-text-tertiary hover:text-text-secondary"
          >
            +
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col gap-1">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;

            return (
              <button
                key={session.id}
                onClick={() => onSelectSession?.(session)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-200 ease-out border border-transparent hover:bg-surface-hover hover:border-surface-border hover:translate-x-[2px] hover:text-text-primary active:scale-[0.99]
                  ${
                    isActive
                      ? "bg-surface-hover text-text-primary"
                      : "text-text-secondary"
                  }`}
              >
                <span
                  className={`w-2 h-2 rounded-full
                    ${
                      isActive
                        ? "bg-accent"
                        : "bg-transparent border border-surface-border"
                    }`}
                />
                <span className="truncate">{session.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <div className="border-t border-surface-border pt-4">
        <button
          type="button"
          className="text-xs text-text-tertiary hover:text-text-secondary font-mono transition-colors active:-translate-y-px"
        >
          Settings
        </button>
      </div>

      {/* Modal */}
      <SessionsCardModal
        open={isModalOpen}
        value={newSessionName}
        onChange={setNewSessionName}
        onClose={() => setIsModalOpen(false)}
        onCreate={() => createSession(newSessionName)}
      />
    </aside>
  );
}
