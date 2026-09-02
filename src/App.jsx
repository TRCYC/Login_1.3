import { lazy, Suspense } from 'react';

const isContextInspector = import.meta.env.DEV
  || window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1'
  || window.location.port === '55444';

const ScreenManager = lazy(() => (
  isContextInspector
    ? import('./DevScreenManager.jsx')
    : import('./ProdScreenManager.jsx')
));

export default function App() {
  return (
    <Suspense fallback={<div className="rcyc-runtime-status">Loading authentication screen...</div>}>
      <ScreenManager />
    </Suspense>
  );
}