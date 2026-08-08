import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

document.getElementById('static-seo')?.remove();

const root = document.getElementById('root');
if (!root) {
  throw new Error('#root not found');
}

async function waitForFonts() {
  if (!document.fonts?.ready) return;

  await Promise.race([
    document.fonts.ready,
    new Promise<void>((resolve) => window.setTimeout(resolve, 2500)),
  ]);
}

async function boot() {
  await waitForFonts();

  createRoot(root).render(
    React.createElement(React.StrictMode, null, React.createElement(App))
  );
}

void boot();
