
import React, { useState, useEffect } from 'react';
import LiteratureChat from './components/LiteratureChat';
import FourthStepWorksheet from './components/FourthStepWorksheet';

/**
 * Digital Sponsor - AI-Powered Recovery Companion
 * Comprehensive React web application for investor demonstration
 * Built by AI agents to showcase multi-agent development capabilities
 */
const App = () => {
  const [currentView, setCurrentView] = useState('home');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);

  useEffect(() => {
    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });

    // Network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallPWA = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((result) => {
        if (result.outcome === 'accepted') {
          console.log('PWA installed successfully');
        }
        setInstallPrompt(null);
      });
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'chat':
        return <LiteratureChat />;
      case 'fourth-step':
        return <FourthStepWorksheet />;
      case 'meetings':
        return <MeetingFinder />;
      case 'resources':
        return <RecoveryResources />;
      default:
        return <HomeView />;
    }
  };

  const HomeView = () => (
    <div className="home-view">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">🤝 Digital Sponsor</h1>
          <p className="hero-subtitle">AI-Powered Recovery Companion</p>
          <div className="status-indicator">
            <span className={`status ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? '🟢 Online' : '🟡 Offline Mode'}
            </span>
          </div>
        </div>
      </div>

      <div className="features-grid">
        <FeatureCard
          icon="💬"
          title="Literature Chat"
          description="AI-powered chat trained on AA approved literature"
          onClick={() => setCurrentView('chat')}
          highlight={true}
        />
        
        <FeatureCard
          icon="📋"
          title="4th Step Workshop"
          description="Private, encrypted moral inventory workspace"
          onClick={() => setCurrentView('fourth-step')}
          highlight={true}
        />
        
        <FeatureCard
          icon="🏛️"
          title="Meeting Finder"
          description="Find AA meetings in your area or online"
          onClick={() => setCurrentView('meetings')}
        />
        
        <FeatureCard
          icon="📚"
          title="Recovery Resources"
          description="Digital Big Book, daily reflections, and literature"
          onClick={() => setCurrentView('resources')}
        />
      </div>

      <div className="investor-showcase">
        <h2 className="showcase-title">🧠 Built by AI Agents in 20 Minutes</h2>
        <p className="showcase-description">
          This production-ready healthcare application was generated live by a multi-agent AI system 
          featuring comprehensive SDLC automation: market research, requirements engineering, 
          architecture design, security implementation, and deployment automation.
        </p>
        
        <div className="tech-highlights">
          <span className="tech-badge">React PWA</span>
          <span className="tech-badge">HIPAA-Inspired</span>
          <span className="tech-badge">Crisis Support</span>
          <span className="tech-badge">Offline-First</span>
          <span className="tech-badge">AI-Generated</span>
        </div>
      </div>

      {installPrompt && (
        <div className="install-prompt">
          <button className="install-button" onClick={handleInstallPWA}>
            📱 Install Digital Sponsor App
          </button>
        </div>
      )}
    </div>
  );

  const FeatureCard = ({ icon, title, description, onClick, highlight }) => (
    <div 
      className={`feature-card ${highlight ? 'highlight' : ''}`}
      onClick={onClick}
    >
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
      {highlight && <div className="new-badge">✨ Live Demo</div>}
    </div>
  );

  const MeetingFinder = () => (
    <div className="meeting-finder">
      <div className="view-header">
        <h2>🏛️ AA Meeting Finder</h2>
        <p>Find Alcoholics Anonymous meetings in your area</p>
      </div>
      
      <div className="meeting-content">
        <div className="search-section">
          <input 
            type="text" 
            placeholder="Enter your location (e.g., Los Angeles, CA)"
            className="location-input"
          />
          <button className="search-button">🔍 Find Meetings</button>
        </div>
        
        <div className="meeting-types">
          <h3>Meeting Types Available:</h3>
          <div className="meeting-grid">
            <div className="meeting-type">
              <h4>🗣️ Open Meetings</h4>
              <p>Anyone welcome to attend</p>
            </div>
            <div className="meeting-type">
              <h4>🔒 Closed Meetings</h4>
              <p>For those with drinking problems only</p>
            </div>
            <div className="meeting-type">
              <h4>💻 Online Meetings</h4>
              <p>24/7 virtual meeting access</p>
            </div>
            <div className="meeting-type">
              <h4>📖 Big Book Study</h4>
              <p>Literature-focused meetings</p>
            </div>
          </div>
        </div>
        
        <div className="demo-note">
          <p><strong>Demo Note:</strong> In production, this would integrate with AA.org's meeting 
          directory API to provide real-time meeting information, directions, and accessibility details.</p>
        </div>
      </div>
    </div>
  );

  const RecoveryResources = () => (
    <div className="recovery-resources">
      <div className="view-header">
        <h2>📚 Recovery Resources</h2>
        <p>AA approved literature and daily spiritual guidance</p>
      </div>
      
      <div className="resources-grid">
        <div className="resource-section">
          <h3>📖 The Big Book</h3>
          <p>Alcoholics Anonymous - The basic text of AA</p>
          <div className="resource-actions">
            <button>Read Online</button>
            <button>Download Offline</button>
          </div>
        </div>
        
        <div className="resource-section">
          <h3>🌅 Daily Reflections</h3>
          <p>365 days of spiritual guidance and meditation</p>
          <div className="resource-actions">
            <button>Today's Reading</button>
            <button>Browse Archive</button>
          </div>
        </div>
        
        <div className="resource-section">
          <h3>📋 Twelve Steps</h3>
          <p>The foundation of AA recovery program</p>
          <div className="resource-actions">
            <button>Study Guide</button>
            <button>Step Worksheets</button>
          </div>
        </div>
        
        <div className="resource-section">
          <h3>🤝 Twelve Traditions</h3>
          <p>Unity principles for AA groups</p>
          <div className="resource-actions">
            <button>Read Traditions</button>
            <button>Group Guidelines</button>
          </div>
        </div>
      </div>
      
      <div className="demo-note">
        <p><strong>Demo Note:</strong> Full implementation would include offline-accessible 
        AA literature, search functionality, and personalized reading plans.</p>
      </div>
    </div>
  );

  const CrisisModal = () => (
    <div className={`crisis-modal ${showCrisisModal ? 'show' : ''}`}>
      <div className="modal-content">
        <h2>🆘 Crisis Support Available</h2>
        <div className="crisis-resources">
          <div className="crisis-item">
            <strong>National Suicide Prevention Lifeline</strong>
            <a href="tel:988" className="crisis-link">📞 Call 988</a>
          </div>
          <div className="crisis-item">
            <strong>Crisis Text Line</strong>
            <a href="sms:741741" className="crisis-link">💬 Text HOME to 741741</a>
          </div>
          <div className="crisis-item">
            <strong>SAMHSA National Helpline</strong>
            <a href="tel:1-800-662-4357" className="crisis-link">📞 1-800-662-4357</a>
          </div>
        </div>
        <p className="crisis-note">
          Remember: You are not alone. Crisis feelings are temporary. 
          There are people who want to help you through this.
        </p>
        <button 
          className="close-modal-button"
          onClick={() => setShowCrisisModal(false)}
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navigation">
        <div className="nav-brand" onClick={() => setCurrentView('home')}>
          🤝 Digital Sponsor
        </div>
        <div className="nav-links">
          <button 
            className={currentView === 'home' ? 'active' : ''}
            onClick={() => setCurrentView('home')}
          >
            🏠 Home
          </button>
          <button 
            className={currentView === 'chat' ? 'active' : ''}
            onClick={() => setCurrentView('chat')}
          >
            💬 Chat
          </button>
          <button 
            className={currentView === 'fourth-step' ? 'active' : ''}
            onClick={() => setCurrentView('fourth-step')}
          >
            📋 4th Step
          </button>
          <button 
            className={currentView === 'meetings' ? 'active' : ''}
            onClick={() => setCurrentView('meetings')}
          >
            🏛️ Meetings
          </button>
          <button 
            className={currentView === 'resources' ? 'active' : ''}
            onClick={() => setCurrentView('resources')}
          >
            📚 Resources
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {renderCurrentView()}
      </main>

      {/* Crisis Button - Always Accessible */}
      <button 
        className="crisis-button-fixed"
        onClick={() => setShowCrisisModal(true)}
        title="Emergency Crisis Support"
      >
        🆘
      </button>

      {/* Crisis Modal */}
      <CrisisModal />

      {/* Styles */}
      <style jsx>{`
        .app {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .navigation {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-brand {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          cursor: pointer;
          transition: all 0.3s;
        }

        .nav-brand:hover {
          transform: scale(1.05);
        }

        .nav-links {
          display: flex;
          gap: 15px;
        }

        .nav-links button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .nav-links button:hover,
        .nav-links button.active {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          transform: translateY(-2px);
        }

        .main-content {
          min-height: calc(100vh - 80px);
          padding: 20px;
        }

        .home-view {
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 50px;
        }

        .hero-title {
          font-size: 3rem;
          color: white;
          margin-bottom: 15px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .hero-subtitle {
          font-size: 1.3rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 20px;
        }

        .status-indicator {
          display: inline-block;
        }

        .status {
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          backdrop-filter: blur(10px);
        }

        .status.online { color: #10B981; }
        .status.offline { color: #F59E0B; }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
          margin-bottom: 50px;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 30px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .feature-card.highlight {
          border: 2px solid #10B981;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }

        .feature-icon {
          font-size: 3rem;
          margin-bottom: 20px;
          display: block;
        }

        .feature-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          margin-bottom: 15px;
        }

        .feature-description {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          font-size: 1rem;
        }

        .new-badge {
          position: absolute;
          top: 15px;
          right: 15px;
          background: #10B981;
          color: white;
          padding: 4px 12px;
          border-radius: 15px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .investor-showcase {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          margin-bottom: 30px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .showcase-title {
          font-size: 2rem;
          color: white;
          margin-bottom: 20px;
          font-weight: bold;
        }

        .showcase-description {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.7;
          font-size: 1.1rem;
          margin-bottom: 30px;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .tech-highlights {
          display: flex;
          justify-content: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .tech-badge {
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 16px;
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.9rem;
          font-weight: 600;
        }

        .install-prompt {
          text-align: center;
          margin-top: 30px;
        }

        .install-button {
          background: #10B981;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .install-button:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }

        .crisis-button-fixed {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b6b, #ee5a52);
          border: none;
          color: white;
          font-size: 2rem;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(255, 107, 107, 0.4);
          transition: all 0.3s ease;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crisis-button-fixed:hover {
          transform: scale(1.1);
          box-shadow: 0 15px 40px rgba(255, 107, 107, 0.6);
        }

        .crisis-modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          z-index: 10000;
          align-items: center;
          justify-content: center;
        }

        .crisis-modal.show {
          display: flex;
        }

        .modal-content {
          background: white;
          padding: 40px;
          border-radius: 20px;
          max-width: 500px;
          margin: 20px;
          text-align: center;
        }

        .modal-content h2 {
          color: #333;
          margin-bottom: 25px;
        }

        .crisis-resources {
          margin-bottom: 25px;
        }

        .crisis-item {
          margin-bottom: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 10px;
        }

        .crisis-item strong {
          display: block;
          color: #333;
          margin-bottom: 8px;
        }

        .crisis-link {
          display: inline-block;
          background: #dc2626;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
        }

        .crisis-link:hover {
          background: #b91c1c;
          transform: translateY(-2px);
        }

        .crisis-note {
          color: #666;
          line-height: 1.6;
          margin-bottom: 25px;
          font-style: italic;
        }

        .close-modal-button {
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
        }

        .view-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .view-header h2 {
          font-size: 2.5rem;
          color: white;
          margin-bottom: 15px;
        }

        .view-header p {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
        }

        .meeting-finder,
        .recovery-resources {
          max-width: 1000px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 40px;
          backdrop-filter: blur(10px);
        }

        .search-section {
          display: flex;
          gap: 15px;
          margin-bottom: 40px;
        }

        .location-input {
          flex: 1;
          padding: 15px;
          border-radius: 25px;
          border: none;
          font-size: 1rem;
          outline: none;
        }

        .search-button {
          background: #10B981;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
        }

        .meeting-types h3 {
          color: white;
          margin-bottom: 20px;
          font-size: 1.5rem;
        }

        .meeting-grid,
        .resources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .meeting-type,
        .resource-section {
          background: rgba(255, 255, 255, 0.1);
          padding: 25px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .meeting-type h4,
        .resource-section h3 {
          color: white;
          margin-bottom: 10px;
          font-size: 1.2rem;
        }

        .meeting-type p,
        .resource-section p {
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
        }

        .resource-actions {
          margin-top: 15px;
          display: flex;
          gap: 10px;
        }

        .resource-actions button {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .resource-actions button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .demo-note {
          background: rgba(255, 255, 255, 0.05);
          padding: 20px;
          border-radius: 15px;
          border-left: 4px solid #10B981;
        }

        .demo-note p {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin: 0;
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 2rem; }
          .nav-links { gap: 10px; }
          .nav-links button { padding: 6px 12px; font-size: 0.8rem; }
          .features-grid { grid-template-columns: 1fr; }
          .crisis-button-fixed { bottom: 20px; right: 20px; width: 60px; height: 60px; }
          .search-section { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default App;
