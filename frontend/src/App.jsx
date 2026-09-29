import { Suspense, lazy } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { PageLoader } from './components/common/Loader.jsx'
import AppShell from './components/layout/AppShell.jsx'

/**
 * App root.
 *
 * Owns the router and nothing else. `AppShell` decides whether the current
 * route gets the product chrome (sidebar, header, mobile nav, toasts) or renders
 * bare, which is what the public landing and about pages want.
 */
const AppRoutes = lazy(() => import('./routes/AppRoutes.jsx'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </Suspense>
    </BrowserRouter>
  )
}
