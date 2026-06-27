import './index.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { useAuth } from './contexts/useAuth'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { RulesPage } from './pages/RulesPage'
import { SettingsPage } from './pages/SettingsPage'
import { MonthsPage } from './pages/MonthsPage'
import { MonthDetailPage } from './pages/MonthDetailPage'

function AppRoutes() {
  const { authLevel } = useAuth()

  if (authLevel === 'loading') {
    return (
      <div className="spinner-wrap">
        <div className="spinner" />
      </div>
    )
  }

  if (authLevel !== 'aal2') {
    return <AuthPage />
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/months" element={<MonthsPage />} />
      <Route path="/months/:month" element={<MonthDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
