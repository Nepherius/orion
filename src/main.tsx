import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { OverlayWindow } from './components/overlay/OverlayWindow.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/overlay" element={<OverlayWindow />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
