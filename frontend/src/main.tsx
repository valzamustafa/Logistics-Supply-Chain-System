import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <ToastProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </ToastProvider>
        </AuthProvider>
      </I18nextProvider>
    </ThemeProvider>
  </React.StrictMode>
);



