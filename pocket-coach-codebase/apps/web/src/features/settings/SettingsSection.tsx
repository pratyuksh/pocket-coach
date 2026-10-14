import React from 'react';

interface SettingsSectionProps {
  title: string;
  /** Right-aligned action in the section header, for example "Add hall". */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** A settings block: 2 px rule, small uppercase title, content. */
export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, action, children }) => (
  <section className="flex flex-col gap-3 border-t-2 border-divider pt-3">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700">
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);
