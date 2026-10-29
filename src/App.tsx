import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { useUIStore } from '@/stores/uiStore';

export const App: React.FC = () => {
  const { setStorageStats } = useUIStore();

  useEffect(() => {
    // Check initial storage estimate
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        setStorageStats(usage || 0, quota || 0);
      }).catch(() => {
        // Fallback gracefully
      });
    }
  }, [setStorageStats]);

  return <RouterProvider router={router} />;
};

export default App;
