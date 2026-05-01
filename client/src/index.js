import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './assets/styles/globals.css';
import './assets/styles/tailwind.css';
import './assets/styles/themes.css';

// Register service worker for PWA
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful');
      },
      (err) => {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}

// Handle offline detection
window.addEventListener('online', () => {
  console.log('Back online');
  // Dispatch custom event for components to react
  window.dispatchEvent(new CustomEvent('online-status', { detail: { online: true } }));
});

window.addEventListener('offline', () => {
  console.log('Offline');
  window.dispatchEvent(new CustomEvent('online-status', { detail: { online: false } }));
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);