
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill process.env for browser environments to ensure API calls don't fail
if (typeof window !== 'undefined') {
  const win = window as any;
  if (!win.process) {
    win.process = { env: { API_KEY: 'AIzaSyDIpSruB_sMqJrkLhZyZDzvZZtToTC-MUA' } };
  } else if (!win.process.env) {
    win.process.env = { API_KEY: 'AIzaSyDIpSruB_sMqJrkLhZyZDzvZZtToTC-MUA' };
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to. Check index.html for <div id='root'></div>");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
