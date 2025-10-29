import { Link, useLocation } from 'react-router-dom'

/**
 * Navigation Component
 * 
 * Main app navigation using React Router with accessibility enhancements
 */
export default function Navigation(): JSX.Element {
  const location = useLocation()
  
  return (
    <nav 
      className="navigation" 
      data-testid="main-navigation"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="nav-container" role="menubar">
        <Link 
          to="/"
          className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
          data-testid="nav-home"
          role="menuitem"
          aria-current={location.pathname === '/' ? 'page' : undefined}
          aria-label="Navigate to Home page"
        >
          🏠 Home
        </Link>
        <Link 
          to="/dashboard"
          className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          data-testid="nav-dashboard"
          role="menuitem"
          aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
          aria-label="Navigate to Recovery Dashboard"
        >
          🎯 Dashboard
        </Link>
        <Link 
          to="/chat"
          className={`nav-item ${location.pathname === '/chat' ? 'active' : ''}`}
          data-testid="nav-chat"
          role="menuitem"
          aria-current={location.pathname === '/chat' ? 'page' : undefined}
          aria-label="Navigate to Chat with Digital Sponsor"
        >
          💬 Chat
        </Link>
        <Link 
          to="/literature"
          className={`nav-item ${location.pathname === '/literature' ? 'active' : ''}`}
          data-testid="nav-literature"
          role="menuitem"
          aria-current={location.pathname === '/literature' ? 'page' : undefined}
          aria-label="Navigate to AA Literature and Study materials"
        >
          📚 Literature
        </Link>
        <Link 
          to="/step-work"
          className={`nav-item ${location.pathname === '/step-work' ? 'active' : ''}`}
          data-testid="nav-step-work"
          role="menuitem"
          aria-current={location.pathname === '/step-work' ? 'page' : undefined}
          aria-label="Navigate to Twelve Steps work documents"
        >
          📋 Steps
        </Link>
        <Link 
          to="/meetings"
          className={`nav-item ${location.pathname === '/meetings' ? 'active' : ''}`}
          data-testid="nav-meetings"
          role="menuitem"
          aria-current={location.pathname === '/meetings' ? 'page' : undefined}
          aria-label="Navigate to AA Meetings finder"
        >
          🏛️ Meetings
        </Link>
        <Link 
          to="/crisis"
          className={`nav-item crisis-nav ${location.pathname === '/crisis' ? 'active' : ''}`}
          data-testid="nav-crisis"
          role="menuitem"
          aria-current={location.pathname === '/crisis' ? 'page' : undefined}
          aria-label="Navigate to Crisis Support - Emergency help"
        >
          🆘 Crisis
        </Link>
      </div>
    </nav>
  )
}