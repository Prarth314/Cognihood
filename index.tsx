
import React from 'react';
import ReactDOM from 'react-dom/client';
import { inject } from '@vercel/analytics';
import '@fortawesome/fontawesome-free/css/all.min.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { consumeEmailConfirmationRedirect, isPasswordRecoveryUrl } from './services/authRedirect';

const passwordRecovery = isPasswordRecoveryUrl(new URL(window.location.href));
const authRedirect = consumeEmailConfirmationRedirect(window);
inject();

const savedTheme = localStorage.getItem('cognihood-theme') || 'system';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = savedTheme === 'dark' || (savedTheme === 'system' && prefersDark);
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider authRedirect={authRedirect} passwordRecovery={passwordRecovery}>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
