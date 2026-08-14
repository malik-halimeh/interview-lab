import { BookOpen, ChartBar, Gauge, House, SignOut, UserCircle } from '@phosphor-icons/react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const links = [
  { to: '/', label: 'Today', icon: House },
  { to: '/library', label: 'Library', icon: BookOpen },
  { to: '/assess', label: 'Assess', icon: Gauge },
  { to: '/leaderboard', label: 'Scores', icon: ChartBar },
  { to: '/profile', label: 'Profile', icon: UserCircle }
]

export function Shell() {
  const auth = useAuth()
  return (
    <div className="app-shell">
      <aside className="rail">
        <NavLink to="/" className="brand" aria-label="Interview Lab home">
          <span className="brand-mark">IL</span>
          <span className="brand-copy"><strong>Interview</strong><span>Lab</span></span>
        </NavLink>
        <nav className="rail-nav" aria-label="Primary navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={20} weight="duotone" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="rail-account">
          <span className="account-alias">{auth.profile.nickname}</span>
          {auth.configured && auth.user ? (
            <button className="icon-text-button" onClick={() => void auth.signOut()}><SignOut size={17} /> Sign out</button>
          ) : (
            <span className="demo-label">Local preview</span>
          )}
        </div>
      </aside>
      <main className="app-main"><Outlet /></main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={20} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
