import { createContext, useContext, useEffect } from 'react';

/**
 * Lets a page replace the title in the page header (the profile page shows the person's name).
 * The shell provides the setter; the title returns to the section's name when the page unmounts.
 */
export const PageTitleContext = createContext<(title: string | null) => void>(() => {});

export const usePageTitle = (title: string | null | undefined) => {
  const setTitle = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title ?? null);
    return () => setTitle(null);
  }, [title, setTitle]);
};
