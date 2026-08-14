import { BookOpen, ChartBar, Gauge, GoogleLogo, House, SignOut, UserCircle } from '@phosphor-icons/react'
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
        <NavLink to="/" className="brand" aria-label="DigitalHub Interview Mock Up home">
          <span className="brand-mark">D1</span>
          <span className="brand-copy"><strong>DigitalHub</strong><span>Interview Mock Up</span></span>
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
          {auth.loading ? <span className="account-state">Checking account</span> : auth.user ? <>
            <span className="account-label">Private workspace</span>
            <span className="account-alias">{auth.profile.nickname}</span>
            <button className="icon-text-button" onClick={() => void auth.signOut()}><SignOut size={17} /> Sign out</button>
          </> : auth.configured ? <>
            <span className="account-state">Progress is private after sign-in.</span>
            <button className="rail-signin" onClick={() => void auth.signIn(window.location.pathname)}><GoogleLogo size={17} weight="bold" /> Sign in</button>
          </> : <span className="account-state">Study library available offline</span>}
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
