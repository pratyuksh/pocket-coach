import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { LanguageSync } from './i18n/LanguageSync';
import { router } from './router';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageSync />
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;
