import { useEffect, useState } from 'react';

/**
 * Hook to detect if the current page/tab is visible to the user
 * Returns true if the page is visible, false if hidden (user switched tabs/windows)
 *
 * Usage:
 * const isVisible = usePageVisibility();
 *
 * In processing code:
 * if (!isVisible) return; // Skip processing when not visible
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
