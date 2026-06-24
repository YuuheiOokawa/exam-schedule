import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// グローバルエラーをバックエンドログへ転送
function sendClientLog(level: 'error' | 'warn', message: string, stack?: string) {
  fetch('/api/client-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level,
      message,
      stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
    }),
  }).catch(() => {});
}

window.addEventListener('error', (e) => {
  sendClientLog('error', e.message, e.error?.stack);
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
  const stack = e.reason instanceof Error ? e.reason.stack : undefined;
  sendClientLog('error', `Unhandled Promise rejection: ${msg}`, stack);
});

// Service Worker 登録（Push通知・PWA用）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('ServiceWorker registration failed:', err);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
