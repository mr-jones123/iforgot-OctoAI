import { useEffect, useRef } from "react";

interface ModalCardProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

export function SessionsCardModal({
  open,
  value,
  onChange,
  onClose,
  onCreate,
}: ModalCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity hover:bg-black/50"
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="
        relative w-[360px]
        rounded-lg border border-surface-border
        bg-background p-4 shadow-lg
        flex flex-col gap-3
        transition-all duration-200
        hover:shadow-xl hover:border-surface-hover
      "
      >
        {/* Title */}
        <div className="text-sm font-medium text-text-primary">
          Create Session
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Frontend, Backend, Bug Tracking"
          className="
            px-2 py-1 text-sm
            bg-transparent
            border border-surface-border
            rounded outline-none
            text-text-primary
            transition-colors
            hover:border-surface-hover
            focus:border-accent
          "
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreate();
            if (e.key === "Escape") onClose();
          }}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="
              text-xs text-text-tertiary
              hover:text-text-secondary
              transition-colors
              hover:underline
            "
          >
            Cancel
          </button>

          <button
            onClick={onCreate}
            className="
              text-xs text-accent
              hover:underline
              transition-all
              hover:opacity-80
              active:scale-[0.98]
            "
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
