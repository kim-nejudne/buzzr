import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted so a LAN game night makes no third-party request.
import '@fontsource/antonio/700.css';
import '@fontsource-variable/sofia-sans/wght.css';
import '@fontsource/dotgothic16/400.css';
import { App } from './App.js';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
