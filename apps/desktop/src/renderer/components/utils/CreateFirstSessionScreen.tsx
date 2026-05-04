import { useState } from "react";

interface Session {
  id: string;
  name: string;
}

export function CreateFirstSessionScreen({
  onCreate,
}: {
  onCreate: (session: Session) => void;
}) {
  const [name, setName] = useState("General");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    setError(null);
    const trimmed = name.trim();

    if (!trimmed) {
      setError("Session name cannot be empty");
      return;
    }

    onCreate({
      id: crypto.randomUUID(),
      name: trimmed,
    });
  }

  return (
    <div className="min-h-[100dvh] bg-[#09090b] flex items-center">
      <div className="pl-[10vw] pr-[6vw] w-full max-w-[640px]">
        {/* Heading */}
        <h1 className="text-4xl font-semibold tracking-tighter text-text-primary leading-none mb-2">
          Create your first session
        </h1>

        <p className="text-text-secondary text-sm leading-relaxed mb-10 max-w-[45ch]">
          Sessions let you organize work inside a workspace. Think of them as
          isolated contexts for tasks, agents, and boards.
        </p>

        <div className="flex flex-col gap-6">
          {/* Session name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-text-tertiary uppercase tracking-widest">
              Session name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="General"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              className="bg-surface-raised border border-surface-border rounded-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary font-mono focus:outline-none focus:border-accent/60 transition-colors duration-200 w-full max-w-sm"
            />
          </div>

          {/* Error */}
          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleCreate}
              className="px-6 py-2.5 rounded-card bg-accent hover:bg-accent-hover text-white text-sm font-medium tracking-tight transition-colors duration-200 active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
