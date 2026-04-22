import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Moon, Sun, Bell, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TopBar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <div className="flex-1 flex items-center">
        {/* Potentially an open-menu button for mobile */}
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className="h-5 w-5" />
          {/* Mock notification dot */}
          <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive"></span>
        </Button>

        {/* User Dropdown / Info */}
        <div className="flex items-center gap-3 ml-2 border-l border-border pl-4">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-sm font-medium">{user?.name || 'Guest'}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</span>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full bg-accent" onClick={() => logout()}>
            <UserIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
