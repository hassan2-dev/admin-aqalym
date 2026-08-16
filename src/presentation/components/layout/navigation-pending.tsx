'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

type NavigationPendingContextValue = {
  pendingHref: string | null;
  isNavigating: boolean;
  startNavigation: (href: string) => void;
};

const NavigationPendingContext = createContext<NavigationPendingContextValue>({
  pendingHref: null,
  isNavigating: false,
  startNavigation: () => undefined,
});

function normalizePath(href: string) {
  try {
    if (href.startsWith('http')) {
      const url = new URL(href);
      return url.pathname || '/';
    }
  } catch {
    // ignore
  }
  const path = href.split('?')[0]?.split('#')[0] || '/';
  return path || '/';
}

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const startNavigation = useCallback(
    (href: string) => {
      const next = normalizePath(href);
      if (next === pathname) return;
      setPendingHref(next);
    },
    [pathname],
  );

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === pathname && url.search === window.location.search) return;
        setPendingHref(url.pathname || '/');
      } catch {
        // ignore
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  const value = useMemo(
    () => ({
      pendingHref,
      isNavigating: pendingHref != null && pendingHref !== pathname,
      startNavigation,
    }),
    [pendingHref, pathname, startNavigation],
  );

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  );
}

export function useNavigationPending() {
  return useContext(NavigationPendingContext);
}
