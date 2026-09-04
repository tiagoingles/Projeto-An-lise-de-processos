import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './lib/toast';
import './index.css';

function Root() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => setClientId(d.googleClientId))
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#334155' }}>
        Não foi possível carregar a configuração do servidor. Verifique se o servidor está no ar.
      </div>
    );
  }
  if (!clientId) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#94a3b8' }}>Carregando…</div>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
