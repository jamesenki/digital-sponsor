import { Link, useLocation } from 'react-router-dom'

/**
 * Navigation Component
 * 
 * Main app navigation using React Router
 */
export default function Navigation(): JSX.Element {
  const location = useLocation()
  
  return (
    <nav className="navigation" data-testid="main-navigation">
      <div className="nav-container">
        <Link 
          to="/"
          className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
          data-testid="nav-home"
        >
          🏠 Home
        </Link>
        <Link 
          to="/chat"
          className={`nav-item ${location.pathname === '/chat' ? 'active' : ''}`}
          data-testid="nav-chat"
        >
          💬 Chat
        </Link>
        <Link 
          to="/literature"
          className={`nav-item ${location.pathname === '/literature' ? 'active' : ''}`}
          data-testid="nav-literature"
        >
          📚 Literature
        </Link>
        <Link 
          to="/step-work"
          className={`nav-item ${location.pathname === '/step-work' ? 'active' : ''}`}
          data-testid="nav-step-work"
        >
          📋 Steps
        </Link>
        <Link 
          to="/meetings"
          className={`nav-item ${location.pathname === '/meetings' ? 'active' : ''}`}
          data-testid="nav-meetings"
        >
          🏛️ Meetings
        </Link>
      </div>
    </nav>
  )
}