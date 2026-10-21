import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Elemen #root tidak ditemukan di index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker via vite-plugin-pwa virtual module
if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('Versi baru tersedia. Muat ulang?')) update()
    },
    onOfflineReady() {
      console.log('App siap offline')
    }
  })
}
