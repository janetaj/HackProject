import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Ticket, 
  ListTodo, 
  FileCheck2, 
  Download, 
  Bell,
  Settings
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/config/api.config';

const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.dashboard, icon: LayoutDashboard },
  { label: 'Jira Tickets', path: ROUTES.jiraTickets, icon: Ticket },
  { label: 'Generation Queue', path: ROUTES.generationQueue, icon: ListTodo },
  { label: 'Test Cases', path: ROUTES.testCases, icon: FileCheck2 },
  { label: 'Exports', path: ROUTES.exports, icon: Download },
  { label: 'Notifications', path: ROUTES.notifications, icon: Bell },
  { label: 'Settings', path: ROUTES.admin, icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex h-full">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="font-bold text-lg text-primary truncate">TestGen AI</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      {/* Footer area inside sidebar could hold minor info or user badge */}
    </aside>
  );
}
