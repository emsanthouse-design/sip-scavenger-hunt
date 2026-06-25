import { useRoute } from './lib/useRoute'
import { isConfigured } from './lib/supabase'
import InternApp from './intern/InternApp.jsx'
import AdminApp from './admin/AdminApp.jsx'

export default function App() {
  const [path] = useRoute()

  if (!isConfigured) return <NotConfigured />

  // Admin lives under /admin; everything else is the intern experience.
  if (path.startsWith('/admin')) return <AdminApp />
  return <InternApp />
}

// Friendly message shown until the Supabase keys are set, so a half-deployed
// site never white-screens an intern or the admin.
function NotConfigured() {
  return (
    <div className="app">
      <div className="topbar">
        <h1>SIP Scavenger Hunt</h1>
      </div>
      <div className="pad stack">
        <div className="banner warn">
          The app isn’t connected to its database yet.
        </div>
        <div className="card stack">
          <h2>Almost there</h2>
          <p className="muted small">
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{' '}
            (in a local <code>.env</code> file, or in Netlify’s environment
            variables) and redeploy. See the README’s setup checklist for the
            exact steps.
          </p>
        </div>
      </div>
    </div>
  )
}
