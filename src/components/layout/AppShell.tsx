import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useUIStore } from '@/stores/uiStore';

export const AppShell: React.FC = () => {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useUIStore();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0c] text-zinc-100 font-sans">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative z-10 flex h-full">
            <Sidebar isMobile />
          </div>
        </div>
      )}

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 bg-[#0a0a0c]">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#16161b',
            border: '1px solid #2a2a36',
            color: '#f4f4f6',
          },
        }}
      />
    </div>
  );
};
