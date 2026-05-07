import { type ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import ChatFab from '@/components/chat/ChatFab';
import ChatDrawer from '@/components/chat/ChatDrawer';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <main className="app-content flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
      <ChatFab />
      <ChatDrawer />
    </div>
  );
}
