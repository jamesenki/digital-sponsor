import React, { useState, useEffect, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import '@/styles/theme.css'
import '@/styles/accessibility.css'

// Types
import type { AppState } from '@/types'

// Core components (always loaded)
import Navigation from '@/components/Navigation'
import CrisisModal from '@/components/CrisisModal'
import CrisisButton from '@/components/CrisisButton'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorBoundary from '@/components/ErrorBoundary'
import ThemeToggle from '@/components/ThemeToggle'

// Lazy-loaded components for code splitting
const HomePage = React.lazy(() => import('@/components/HomePage'))
const ChatPage = React.lazy(() => import('@/components/ChatPage'))
const EnhancedLiteraturePage = React.lazy(() => import('@/components/EnhancedLiteraturePage'))
const StepWorkPage = React.lazy(() => import('@/components/StepWorkPage'))
const MeetingsPage = React.lazy(() => import('@/components/MeetingsPage'))
const RecoveryDashboard = React.lazy(() => import('@/components/RecoveryDashboard'))
const CrisisSupport = React.lazy(() => import('@/components/CrisisSupport'))
const PerformanceDashboard = React.lazy(() => import('@/components/PerformanceDashboard'))
const RecoveryResourceLibrary = React.lazy(() => import('@/components/RecoveryResourceLibrary'))

// Hooks
import { useSession } from '@/hooks/useSession'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { usePWA } from '@/hooks/usePWA'
import { useTheme } from '@/hooks/useTheme'
import { useAccessibility } from '@/hooks/useAccessibility'
import { usePerformance, useRoutePerformance } from '@/hooks/usePerformance'

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
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false)
  const [showResourceLibrary, setShowResourceLibrary] = useState(false)

  // Custom hooks
  const { session, createSession } = useSession()
  const isOnline = useOnlineStatus()
  const { currentTheme } = useTheme()
  const { announcePageChange, enhanceAriaLabels } = useAccessibility()
  const { 
    performIntelligentPreloading, 
    optimizeBundle,
    recordComponentPerformance 
  } = usePerformance()
  const { 
    isInstalled, 
    canInstall, 
    updateAvailable, 
    swRegistered,
    installApp,
    checkForUpdates 
  } = usePWA()

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

  // Initialize accessibility features
  useEffect(() => {
    // Enhance ARIA labels after component mount
    setTimeout(() => {
      enhanceAriaLabels()
    }, 1000)
  }, [enhanceAriaLabels])

  // Initialize performance optimizations
  useEffect(() => {
    // Record app component performance
    const startTime = performance.now()
    
    setTimeout(() => {
      const mountTime = performance.now() - startTime
      recordComponentPerformance('App', mountTime)
      
      // Perform intelligent preloading after app is loaded
      performIntelligentPreloading()
      
      // Optimize bundle after a delay
      setTimeout(() => {
        optimizeBundle()
      }, 5000)
    }, 100)
  }, [recordComponentPerformance, performIntelligentPreloading, optimizeBundle])

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
                {swRegistered && (
                  <span className="pwa-indicator">
                    {isInstalled ? '📱 PWA' : '🌐 Web'}
                  </span>
                )}
                <span className="privacy-indicator">
                  🔒 Anonymous
                </span>
                <button
                  onClick={() => setShowResourceLibrary(true)}
                  className="header-action-button"
                  title="Recovery Resources"
                  aria-label="Open Recovery Resource Library"
                >
                  Resources
                </button>
                <ThemeToggle size="small" className="header-theme-toggle" />
              </div>
            </div>
            
            {/* PWA Install Banner */}
            {canInstall && !isInstalled && (
              <div className="install-banner">
                <span>📱 Install Digital Sponsor for offline access</span>
                <button 
                  onClick={installApp}
                  className="install-button"
                >
                  Install App
                </button>
              </div>
            )}
            
            {/* Update Available Banner */}
            {updateAvailable && (
              <div className="update-banner">
                <span>🔄 App update available</span>
                <button 
                  onClick={() => window.location.reload()}
                  className="update-button"
                >
                  Update Now
                </button>
              </div>
            )}
          </header>

          {/* Navigation */}
          <Navigation />

          {/* Main Content */}
          <main className="main-content" id="main-content" role="main" aria-label="Main application content">
            <Suspense fallback={
              <div className="route-loading">
                <LoadingSpinner />
                <p>Loading...</p>
              </div>
            }>
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
                  <EnhancedLiteraturePage 
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
              <Route 
                path="/dashboard" 
                element={
                  <RecoveryDashboard 
                    isOnline={isOnline}
                    session={session}
                  />
                } 
              />
              <Route 
                path="/crisis" 
                element={
                  <CrisisSupport 
                    isOnline={isOnline}
                    session={session}
                  />
                } 
              />
              </Routes>
            </Suspense>
          </main>

          {/* Crisis Support - Always Accessible */}
          <CrisisButton onClick={handleCrisisClick} />

          {/* Crisis Modal */}
          {showCrisisModal && (
            <CrisisModal isOpen={showCrisisModal} onClose={() => setShowCrisisModal(false)} />
          )}

          {/* Recovery Resource Library */}
          {showResourceLibrary && (
            <Suspense fallback={<LoadingSpinner />}>
              <RecoveryResourceLibrary 
                isOpen={showResourceLibrary} 
                onClose={() => setShowResourceLibrary(false)} 
              />
            </Suspense>
          )}

          {/* Performance Dashboard */}
          {showPerformanceDashboard && (
            <Suspense fallback={<LoadingSpinner />}>
              <PerformanceDashboard 
                isOpen={showPerformanceDashboard} 
                onClose={() => setShowPerformanceDashboard(false)} 
              />
            </Suspense>
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