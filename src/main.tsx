import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './index.css';

const App = lazy(() => import('./App.tsx'));
const OverlayWindow = lazy(() =>
  import('./components/overlay/OverlayWindow.tsx').then(module => ({ default: module.OverlayWindow }))
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Suspense fallback={<div style={{ width: '100vw', height: '100vh', backgroundColor: 'var(--color-bg, #060607)' }} />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/overlay" element={<OverlayWindow />} />
        </Routes>
      </Suspense>
    </HashRouter>
  </React.StrictMode>
);
