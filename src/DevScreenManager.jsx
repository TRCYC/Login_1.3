import { lazy, Suspense } from 'react';
import {
  UniversalLoginContextPanel,
  useUniversalLoginContextSubscription,
} from '@auth0/ul-context-inspector';

const LoginScreen = lazy(() => import('./screens/login/index.jsx'));

export default function DevScreenManager() {
  const context = useUniversalLoginContextSubscription();
  const screenName = context?.screen?.name;

  return (
    <>
      <UniversalLoginContextPanel />
      {screenName === 'login' ? (
        <Suspense fallback={<div className="rcyc-runtime-status">Loading login screen...</div>}>
          <LoginScreen key={screenName} />
        </Suspense>
      ) : (
        <div className="rcyc-runtime-status">
          {screenName ? `Screen "${screenName}" is not implemented.` : 'Waiting for Universal Login context...'}
        </div>
      )}
    </>
  );
}