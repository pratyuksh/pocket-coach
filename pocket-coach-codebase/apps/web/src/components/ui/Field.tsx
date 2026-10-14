import React, { createContext, useContext, useId } from 'react';

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}

/** Label, control and optional hint or error, wired together for assistive technology. */
export const Field: React.FC<FieldProps> = ({ label, hint, error, className = '', children }) => {
  const id = useId();
  const messageId = error || hint ? `${id}-msg` : undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy: messageId, invalid: !!error }}>
      <div className={className}>
        <label htmlFor={id} className="block text-xs mb-1.5 text-text/70">
          {label}
        </label>
        {children}
        {(error || hint) && (
          <p
            id={messageId}
            className={`mt-1.5 text-xs ${error ? 'text-accent-700' : 'text-neutral-700'}`}
          >
            {error || hint}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Flat input. Inside a Field it takes its id and descriptions from the field. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', id, ...props }, ref) => {
    const field = useContext(FieldContext);
    return (
      <input
        ref={ref}
        id={id ?? field?.id}
        aria-describedby={field?.describedBy}
        aria-invalid={field?.invalid || undefined}
        className={`w-full min-h-9 px-2.5 py-1.5 text-sm text-text bg-surface border border-divider caret-accent hover:border-text/45 focus-visible:border-accent focus-visible:outline-offset-0 ${field?.invalid ? 'border-accent' : ''} ${className}`}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Flat multi-line input; wired to a surrounding Field like Input. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', id, rows = 3, ...props }, ref) => {
    const field = useContext(FieldContext);
    return (
      <textarea
        ref={ref}
        id={id ?? field?.id}
        rows={rows}
        aria-describedby={field?.describedBy}
        aria-invalid={field?.invalid || undefined}
        className={`w-full min-h-[90px] resize-y px-2.5 py-1.5 text-sm text-text bg-surface border border-divider caret-accent hover:border-text/45 focus-visible:border-accent focus-visible:outline-offset-0 ${field?.invalid ? 'border-accent' : ''} ${className}`}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
