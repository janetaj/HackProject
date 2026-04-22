import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ChatbotWidget } from '../chatbot/ChatbotWidget';

export function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto bg-muted/20">
          <Outlet />
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
}
