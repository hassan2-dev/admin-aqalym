'use client';

import { Menu, Moon, Sun, Bell, Settings, Search, HelpCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { useAuth } from '@/presentation/providers/auth-provider';
import { ROLE_LABELS } from '@/domain/enums';
import { ar } from '@/presentation/i18n/ar';
import { cn } from '@/shared/lib/utils';

export function Header({
  onMenu,
  title,
}: {
  onMenu: () => void;
  title?: string;
}) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('') || '؟';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md no-print md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden min-w-0 md:block">
        <p className="truncate text-sm font-semibold">{title || ar.businessOverview}</p>
        <p className="truncate text-xs text-muted-foreground">
          {user ? ROLE_LABELS[user.roleSlug] : ''}
        </p>
      </div>

      <div className="mx-auto hidden w-full max-w-md lg:block">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-10 rounded-full border-border/80 bg-muted/40 pe-9" placeholder={ar.searchSystem} />
        </div>
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link href="/notifications" aria-label={ar.notifications}>
            <Bell className="h-4.5 w-4.5" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={ar.darkMode}
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" asChild>
          <Link href="/settings" aria-label={ar.settings}>
            <Settings className="h-4.5 w-4.5" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex" asChild>
          <Link href="/notifications">
            <HelpCircle className="h-4.5 w-4.5" />
          </Link>
        </Button>

        <div className={cn('ms-1 flex items-center gap-2 rounded-full border border-border bg-muted/30 py-1 pe-3 ps-1')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-xs font-semibold leading-tight">{user?.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {user ? ROLE_LABELS[user.roleSlug] : ''}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
