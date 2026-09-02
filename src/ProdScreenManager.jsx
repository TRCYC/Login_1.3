import { lazy, Suspense, useEffect, useState } from 'react';

const LoginScreen = lazy(() => import('./screens/login/index.jsx'));

function getScreenName() {
  return window.universal_login_context?.screen?.name || '';
}

export default function ProdScreenManager() {
  const [screenName, setScreenName] = useState(getScreenName);

  useEffect(() => {
    if (screenName) {
      return undefined;
    }

    const contextWaiter = window.setInterval(() => {
      const nextScreenName = getScreenName();
      if (nextScreenName) {
        setScreenName(nextScreenName);
        window.clearInterval(contextWaiter);
      }
    }, 50);

    return () => window.clearInterval(contextWaiter);
  }, [screenName]);

  if (!screenName) {
    return <div className="rcyc-runtime-status">Loading authentication screen...</div>;
  }

  if (screenName !== 'login') {
    return <div className="rcyc-runtime-status">Screen "{screenName}" is not implemented.</div>;
  }

  return (
    <Suspense fallback={<div className="rcyc-runtime-status">Loading login screen...</div>}>
      <LoginScreen key={screenName} />
    </Suspense>
  );
}