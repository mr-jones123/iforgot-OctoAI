import type { AgentProvider, Card } from "@riza/shared";
import { useState } from "react";

const PROVIDERS: { id: AgentProvider; label: string }[] = [
  { id: "claude-code", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "gemini", label: "Gemini CLI" },
  { id: "ollama", label: "Ollama" },
];

interface CardModalProps {
  columnId: string;
  // If editing an existing card, pass it here — fields will be pre-filled
  existing?: Card;
  onConfirm: (
    title: string,
    description: string,
    provider: AgentProvider,
  ) => void;
  onCancel: () => void;
}

export function CardModal({ existing, onConfirm, onCancel }: CardModalProps) {
  const isEdit = !!existing;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDesc] = useState(existing?.description ?? "");
  const [provider, setProvider] = useState<AgentProvider>(
    existing?.agent.provider ?? "claude-code",
  );
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    onConfirm(title.trim(), description.trim(), provider);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
      style={{ zIndex: 50 }}
      onClick={onCancel}
    >
      <div
        className="glass-panel rounded-panel w-full max-w-md mx-4 p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-base font-semibold tracking-tight text-text-primary mb-1">
            {isEdit ? "Edit task" : "New task"}
          </h2>
          <p className="text-xs text-text-tertiary">
            {isEdit
              ? "Changes apply to the next run. Editing does not restart a running agent."
              : "Describe the task. The agent will receive this as its prompt."}
          </p>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
            Title
          </label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Build the auth module"
            className="bg-surface-overlay border border-surface-border rounded-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary font-sans focus:outline-none focus:border-accent/60 transition-colors duration-200"
          />
        </div>

        {/* Task prompt */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
            Task prompt
          </label>
          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Implement JWT-based auth with refresh tokens. Use existing User model. Tests required."
            rows={4}
            className="bg-surface-overlay border border-surface-border rounded-card px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary font-sans focus:outline-none focus:border-accent/60 transition-colors duration-200 resize-none leading-relaxed"
          />
        </div>

        {/* Agent provider */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest">
            Agent
          </label>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={[
                  "px-3 py-1.5 rounded-card border text-xs font-mono transition-all duration-150 active:scale-[0.97]",
                  provider === p.id
                    ? "border-accent/60 bg-accent/10 text-text-primary"
                    : "border-surface-border text-text-tertiary hover:border-surface-muted",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-mono text-text-tertiary hover:text-text-secondary transition-colors active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-card bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors duration-150 active:scale-[0.97]"
          >
            {isEdit ? "Save changes" : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}
