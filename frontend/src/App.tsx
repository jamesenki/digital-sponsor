import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

// Types
import type { AppState } from '@/types'

// Components
import Navigation from '@/components/Navigation'
import HomePage from '@/components/HomePage'
import ChatPage from '@/components/ChatPage'
import LiteraturePage from '@/components/LiteraturePage'
import StepWorkPage from '@/components/StepWorkPage'
import MeetingsPage from '@/components/MeetingsPage'
import CrisisModal from '@/components/CrisisModal'
import CrisisButton from '@/components/CrisisButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorBoundary from '@/components/ErrorBoundary'

// Hooks
import { useSession } from '@/hooks/useSession'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * Digital Sponsor Main Application Component
 * 
 * Implements AA Traditions:
 * - Tradition 12: Complete anonymity (no user accounts/tracking)
 * - Tradition 6: No endorsements (filtered content only)
 * - Tradition 5: Focus on recovery from alcoholism
 */
function App(): JSX.Element {
  // Application state
  const [appState, setAppState] = useState<AppState>({
    currentView: 'home',
    isOnline: true,
    session: null,
    isLoading: true,
    error: null
  })

  const [showCrisisModal, setShowCrisisModal] = useState(false)

  // Custom hooks
  const { session, createSession } = useSession()
  const isOnline = useOnlineStatus()

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Create anonymous session per AA Tradition 12
        const newSession = await createSession()
        
        setAppState(prev => ({
          ...prev,
          session: newSession,
          isOnline,
          isLoading: false
        }))

        // Log anonymous app initialization (no personal data)
        console.log('🤝 Digital Sponsor initialized - Anonymous mode active')
        console.log('📱 Built for AA community service - Traditions compliant')
        
      } catch (error) {
        console.error('App initialization error:', error)
        setAppState(prev => ({
          ...prev,
          error: 'Failed to initialize app. Please refresh and try again.',
          isLoading: false
        }))
      }
    }

    initializeApp()
  }, [createSession, isOnline])

  // Update online status
  useEffect(() => {
    setAppState(prev => ({ ...prev, isOnline }))
  }, [isOnline])

  // Handle view changes
  const handleViewChange = (view: AppState['currentView']) => {
    setAppState(prev => ({ ...prev, currentView: view }))
  }

  // Handle crisis button click
  const handleCrisisClick = () => {
    setShowCrisisModal(true)
    
    // Anonymous crisis event logging (no personal data)
    console.log('🆘 Crisis support accessed')
  }

  // Handle app errors
  const handleError = (error: string) => {
    setAppState(prev => ({ ...prev, error }))
  }

  // Clear errors
  const clearError = () => {
    setAppState(prev => ({ ...prev, error: null }))
  }

  // Loading state
  if (appState.isLoading) {
    return (
      <div className="app-loading">
        <LoadingSpinner />
        <p>Initializing Digital Sponsor...</p>
        <p className="text-sm opacity-75">Anonymous • Privacy-First • AA Traditions Compliant</p>
      </div>
    )
  }

  // Error state
  if (appState.error) {
    return (
      <div className="app-error">
        <h2>🚨 Application Error</h2>
        <p>{appState.error}</p>
        <button onClick={clearError} className="retry-button">
          Try Again
        </button>
        <CrisisButton onClick={handleCrisisClick} />
        {showCrisisModal && (
          <CrisisModal isOpen={showCrisisModal} onClose={() => setShowCrisisModal(false)} />
        )}
      </div>
    )
  }

  return (
    <ErrorBoundary onError={handleError}>
      <Router>
        <div className="app" data-testid="digital-sponsor-app">
          {/* App Header with Status */}
          <header className="app-header">
            <div className="status-bar">
              <span className="app-title">🤝 Digital Sponsor</span>
              <div className="status-indicators">
                <span className={`status ${isOnline ? 'online' : 'offline'}`}>
                  {isOnline ? '🟢 Online' : '🟡 Offline Mode'}
                </span>
                <span className="privacy-indicator">
                  🔒 Anonymous
                </span>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <Navigation />

          {/* Main Content */}
          <main className="main-content">
            <Routes>
              <Route 
                path="/" 
                element={
                  <HomePage 
                    isOnline={isOnline}
                    session={session}
                  />
                } 
              />
              <Route 
                path="/chat" 
                element={
                  <ChatPage 
                    isOnline={isOnline}
                    session={session}
                  />
                } 
              />
              <Route 
                path="/literature" 
                element={
                  <LiteraturePage 
                    isOnline={isOnline}
                    session={session}
                  />
                } 
              />
              <Route 
                path="/step-work" 
                element={
                  <StepWorkPage 
                    isOnline={isOnline}
                    session={session}
                  />
                } 
              />
              <Route 
                path="/meetings" 
                element={
                  <MeetingsPage 
                    isOnline={isOnline}
                    session={session}
                  />
                } 
              />
            </Routes>
          </main>

          {/* Crisis Support - Always Accessible */}
          <CrisisButton onClick={handleCrisisClick} />

          {/* Crisis Modal */}
          {showCrisisModal && (
            <CrisisModal isOpen={showCrisisModal} onClose={() => setShowCrisisModal(false)} />
          )}

          {/* App Footer */}
          <footer className="app-footer">
            <div className="footer-content">
              <p className="disclaimer">
                Digital Sponsor is not affiliated with AA World Services. 
                This tool supplements, but does not replace, traditional fellowship and sponsorship.
              </p>
              <div className="traditions-compliance">
                <span>✅ AA Traditions Compliant</span>
                <span>🔒 Privacy-First</span>
                <span>🤝 Community Service</span>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App