import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.tsx'
import { store } from './store/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

// Fade out the boot splash once React has mounted (idempotent for StrictMode).
requestAnimationFrame(() => {
  const splash = document.getElementById('boot-splash');
  if (!splash) return;
  splash.classList.add('hide');
  window.setTimeout(() => splash.remove(), 500);
});
