import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'

function AppInner() {
  const { authLevel } = useAuth()

  if (authLevel === 'loading') {
    return (
      <div className="spinner-wrap">
        <div className="spinner" />
      </div>
    )
  }

  if (authLevel === 'aal2') {
    return <DashboardPage />
  }

  return <AuthPage />
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

export default App
