import React, { Suspense } from 'react';
import { useAppStore } from './store';
import { useCompare } from './hooks/useCompare';
import { ErrorToast } from './components/ErrorToast/ErrorToast';

const Landing = React.lazy(() => import('./views/Landing/Landing'));
const Viewer = React.lazy(() => import('./views/Viewer/Viewer'));

function ParsingOverlay() {
  const progress = useAppStore((s) => s.parseProgress);
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 16,
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: '3px solid var(--border-default)',
        borderTopColor: 'var(--brand)',
        borderRadius: '50%',
        animation: 'spin 800ms linear infinite',
      }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
        {progress.phase === 'parsing' ? 'Parsing files...' : 'Computing differences...'}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  useCompare();
  const view = useAppStore((s) => s.view);

  return (
    <>
      <Suspense fallback={null}>
        {view === 'landing' && <Landing />}
        {view === 'parsing' && <ParsingOverlay />}
        {view === 'viewer' && <Viewer />}
      </Suspense>
      <ErrorToast />
    </>
  );
}
