interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group, for example "Language". */
  ariaLabel: string;
  className?: string;
}

/** Radio group drawn as a row of flat segments (language switch, view switch). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedControlProps<T>) {
  const focusAt = (index: number) => {
    const next = options[(index + options.length) % options.length];
    onChange(next.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex border border-divider ${className}`}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                focusAt(index + 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                focusAt(index - 1);
              }
            }}
            className={`px-2.5 py-1 text-xs font-semibold cursor-pointer focus-visible:-outline-offset-2 ${
              index > 0 ? 'border-l border-divider' : ''
            } ${selected ? 'bg-accent text-bg' : 'bg-bg text-text hover:bg-text/7'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
