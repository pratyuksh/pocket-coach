import React, { useId } from 'react';

interface CheckRowProps {
  label: string;
  description?: string;
  checked: boolean;
  /** Not called when the row is locked. */
  onChange?: (checked: boolean) => void;
  /** Always-on rows (for example the base Trainer role) are shown dimmed and cannot be toggled. */
  locked?: boolean;
}

/** A labelled checkbox row with a square box and a short description (roles, labels). */
export const CheckRow: React.FC<CheckRowProps> = ({
  label,
  description,
  checked,
  onChange,
  locked = false,
}) => {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={locked || undefined}
      aria-labelledby={labelId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={() => {
        if (!locked) onChange?.(!checked);
      }}
      className={`grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5 border-b border-divider bg-transparent py-2.5 text-left text-text ${
        locked ? 'cursor-default' : 'cursor-pointer hover:bg-neutral-100'
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid size-[18px] place-items-center border-[1.5px] border-text text-xs text-bg ${
          checked ? 'bg-text' : 'bg-transparent'
        } ${locked ? 'opacity-45' : ''}`}
      >
        {checked ? '✓' : ''}
      </span>
      <span className="flex flex-col">
        <span id={labelId} className="text-sm font-semibold">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="text-xs text-neutral-700">
            {description}
          </span>
        )}
      </span>
    </button>
  );
};
