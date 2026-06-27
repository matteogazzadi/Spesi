import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/useAuth'

interface Props { children: ReactNode }

export function AppLayout({ children }: Props) {
  const { signOut } = useAuth()
  return (
    <>
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span className="app-logo">Spesi</span>
          <nav className="app-nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
            <NavLink to="/months" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Months</NavLink>
            <NavLink to="/rules" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Rules</NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Settings</NavLink>
          </nav>
        </div>
        <button className="btn-ghost" onClick={signOut}>Sign out</button>
      </header>
      <main className="app-main">{children}</main>
    </>
  )
}
