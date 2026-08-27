import React from 'react';

export default function App({ Component, pageProps }) {
  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Quicksand, sans-serif' }}>
      <Component {...pageProps} />
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #f6828d; color: #8b5e3b; }
        body, input, select, textarea, button { font-family: 'Quicksand', sans-serif; }
        input::placeholder, textarea::placeholder { color: #b28b7a; opacity: 0.9; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #ff7380 !important; box-shadow: 0 0 0 3px rgba(255, 115, 128, .18); }
        button:disabled { opacity: .6; cursor: not-allowed; }
        button:not(:disabled):hover { transform: translateY(-1px); }
        @media (max-width: 640px) {
          .ksc-shell { padding: 16px 12px !important; }
          .ksc-card { padding: 20px !important; }
          .ksc-logo { width: 128px !important; height: 128px !important; }
          .ksc-title { font-size: 28px !important; }
        }
      `}</style>
    </div>
  );
}
