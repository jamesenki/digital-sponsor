import React, { useState, useEffect } from 'react'
import { usePerformance } from '@/hooks/usePerformance'
import type { PerformanceMetrics, ComponentPerformance, RoutePerformance } from '@/services/performanceService'

interface PerformanceDashboardProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Performance Dashboard Component
 * 
 * Displays real-time performance metrics, insights, and optimization recommendations
 */
export default function PerformanceDashboard({ isOpen, onClose }: PerformanceDashboardProps): JSX.Element | null {
  const {
    latestMetrics,
    config,
    updateConfig,
    collectMetrics,
    getMetricsHistory,
    getComponentMetrics,
    getRouteMetrics,
    getPerformanceInsights,
    performanceScore,
    webVitalsScore
  } = usePerformance()

  const [activeTab, setActiveTab] = useState<'overview' | 'components' | 'routes' | 'settings'>('overview')
  const [isCollecting, setIsCollecting] = useState(false)
  const [history, setHistory] = useState<PerformanceMetrics[]>([])
  const [componentMetrics, setComponentMetrics] = useState<ComponentPerformance[]>([])
  const [routeMetrics, setRouteMetrics] = useState<RoutePerformance[]>([])
  const [insights, setInsights] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      refreshData()
    }
  }, [isOpen])

  const refreshData = async () => {
    setIsCollecting(true)
    try {
      await collectMetrics()
      setHistory(getMetricsHistory(10))
      setComponentMetrics(getComponentMetrics())
      setRouteMetrics(getRouteMetrics())
      setInsights(getPerformanceInsights())
    } finally {
      setIsCollecting(false)
    }
  }

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatMs = (ms: number): string => {
    return `${ms.toFixed(1)}ms`
  }

  if (!isOpen) return null

  return (
    <div className="performance-dashboard-overlay">
      <div className="performance-dashboard" role="dialog" aria-labelledby="performance-title">
        <header className="dashboard-header">
          <h2 id="performance-title">📊 Performance Dashboard</h2>
          <div className="header-actions">
            <button 
              onClick={refreshData} 
              disabled={isCollecting}
              className="refresh-button"
              aria-label="Refresh performance data"
            >
              {isCollecting ? '⏳' : '🔄'} Refresh
            </button>
            <button 
              onClick={onClose} 
              className="close-button"
              aria-label="Close performance dashboard"
            >
              ✕
            </button>
          </div>
        </header>

        <nav className="dashboard-tabs" role="tablist">
          {[
            { id: 'overview', label: '📈 Overview' },
            { id: 'components', label: '🧩 Components' },
            { id: 'routes', label: '🛣️ Routes' },
            { id: 'settings', label: '⚙️ Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              {/* Performance Scores */}
              <section className="score-section">
                <h3>Performance Scores</h3>
                <div className="score-grid">
                  <div className="score-card">
                    <div className={`score ${getScoreColor(performanceScore)}`}>
                      {performanceScore}
                    </div>
                    <div className="score-label">Overall Performance</div>
                  </div>
                  <div className="score-card">
                    <div className={`score ${getScoreColor(webVitalsScore)}`}>
                      {webVitalsScore}
                    </div>
                    <div className="score-label">Web Vitals</div>
                  </div>
                </div>
              </section>

              {/* Core Web Vitals */}
              {latestMetrics && (
                <section className="vitals-section">
                  <h3>Core Web Vitals</h3>
                  <div className="vitals-grid">
                    <div className="vital-card">
                      <div className="vital-value">
                        {latestMetrics.lcp ? formatMs(latestMetrics.lcp) : 'N/A'}
                      </div>
                      <div className="vital-label">
                        LCP (Largest Contentful Paint)
                        <div className="vital-threshold">Good: &lt; 2.5s</div>
                      </div>
                    </div>
                    <div className="vital-card">
                      <div className="vital-value">
                        {latestMetrics.fid ? formatMs(latestMetrics.fid) : 'N/A'}
                      </div>
                      <div className="vital-label">
                        FID (First Input Delay)
                        <div className="vital-threshold">Good: &lt; 100ms</div>
                      </div>
                    </div>
                    <div className="vital-card">
                      <div className="vital-value">
                        {latestMetrics.cls ? latestMetrics.cls.toFixed(3) : 'N/A'}
                      </div>
                      <div className="vital-label">
                        CLS (Cumulative Layout Shift)
                        <div className="vital-threshold">Good: &lt; 0.1</div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Performance Insights */}
              {insights.length > 0 && (
                <section className="insights-section">
                  <h3>🔍 Performance Insights</h3>
                  <div className="insights-list">
                    {insights.map((insight, index) => (
                      <div key={index} className="insight-card">
                        <div className="insight-icon">💡</div>
                        <div className="insight-text">{insight}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Resource Usage */}
              {latestMetrics && (
                <section className="resources-section">
                  <h3>Resource Usage</h3>
                  <div className="resource-grid">
                    <div className="resource-card">
                      <div className="resource-value">{latestMetrics.memoryUsage}%</div>
                      <div className="resource-label">Memory Usage</div>
                    </div>
                    <div className="resource-card">
                      <div className="resource-value">{formatBytes(latestMetrics.bundleSize * 1024)}</div>
                      <div className="resource-label">Bundle Size</div>
                    </div>
                    <div className="resource-card">
                      <div className="resource-value">{latestMetrics.cacheHitRate}%</div>
                      <div className="resource-label">Cache Hit Rate</div>
                    </div>
                    <div className="resource-card">
                      <div className="resource-value">{latestMetrics.errorRate.toFixed(1)}%</div>
                      <div className="resource-label">Error Rate</div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'components' && (
            <div className="components-tab">
              <h3>Component Performance</h3>
              <div className="component-list">
                {componentMetrics.length === 0 ? (
                  <p>No component metrics available</p>
                ) : (
                  componentMetrics.map(component => (
                    <div key={component.name} className="component-card">
                      <div className="component-header">
                        <span className="component-name">{component.name}</span>
                        <span className={`priority-badge priority-${component.priority}`}>
                          {component.priority}
                        </span>
                      </div>
                      <div className="component-metrics">
                        <div className="metric">
                          <span className="metric-label">Mount Time:</span>
                          <span className="metric-value">{formatMs(component.mountTime)}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Updates:</span>
                          <span className="metric-value">{component.updateCount}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Errors:</span>
                          <span className="metric-value">{component.errorCount}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Last Used:</span>
                          <span className="metric-value">
                            {component.lastUsed.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="routes-tab">
              <h3>Route Performance</h3>
              <div className="route-list">
                {routeMetrics.length === 0 ? (
                  <p>No route metrics available</p>
                ) : (
                  routeMetrics.map(route => (
                    <div key={route.path} className="route-card">
                      <div className="route-header">
                        <span className="route-path">{route.path}</span>
                        {route.preloaded && (
                          <span className="preloaded-badge">📦 Preloaded</span>
                        )}
                      </div>
                      <div className="route-metrics">
                        <div className="metric">
                          <span className="metric-label">Load Time:</span>
                          <span className="metric-value">{formatMs(route.loadTime)}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Visits:</span>
                          <span className="metric-value">{route.visits}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Last Visit:</span>
                          <span className="metric-value">
                            {route.lastVisit.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Resources:</span>
                          <span className="metric-value">{route.resources.length}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-tab">
              <h3>Performance Settings</h3>
              <div className="settings-form">
                <div className="setting-group">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.enableMetrics}
                      onChange={(e) => updateConfig({ enableMetrics: e.target.checked })}
                    />
                    Enable Performance Monitoring
                  </label>
                  <p className="setting-description">
                    Collect and analyze performance metrics
                  </p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.enablePreloading}
                      onChange={(e) => updateConfig({ enablePreloading: e.target.checked })}
                    />
                    Enable Resource Preloading
                  </label>
                  <p className="setting-description">
                    Preload resources for faster navigation
                  </p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={config.bundleOptimization}
                      onChange={(e) => updateConfig({ bundleOptimization: e.target.checked })}
                    />
                    Enable Bundle Optimization
                  </label>
                  <p className="setting-description">
                    Optimize bundle size and loading
                  </p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">
                    Preload Strategy:
                    <select
                      value={config.preloadStrategy}
                      onChange={(e) => updateConfig({ 
                        preloadStrategy: e.target.value as 'aggressive' | 'conservative' | 'adaptive' 
                      })}
                      className="setting-select"
                    >
                      <option value="conservative">Conservative</option>
                      <option value="adaptive">Adaptive</option>
                      <option value="aggressive">Aggressive</option>
                    </select>
                  </label>
                  <p className="setting-description">
                    How aggressively to preload resources
                  </p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">
                    Monitoring Interval:
                    <input
                      type="number"
                      value={config.monitoringInterval}
                      onChange={(e) => updateConfig({ 
                        monitoringInterval: parseInt(e.target.value) || 30 
                      })}
                      min="10"
                      max="300"
                      className="setting-input"
                    />
                    seconds
                  </label>
                  <p className="setting-description">
                    How often to collect performance metrics
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// CSS styles for the performance dashboard
const styles = `
.performance-dashboard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.performance-dashboard {
  background: var(--bg-color);
  border-radius: 12px;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-color);
}

.dashboard-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-color);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.refresh-button,
.close-button {
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  color: var(--text-color);
  transition: background-color 0.2s;
}

.refresh-button:hover,
.close-button:hover {
  background: var(--button-hover-bg);
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dashboard-tabs {
  display: flex;
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  background: none;
  border: none;
  padding: 1rem 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-button:hover {
  background: var(--hover-bg);
  color: var(--text-color);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background: var(--bg-color);
}

.dashboard-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.score-section h3,
.vitals-section h3,
.insights-section h3,
.resources-section h3 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.score-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.score {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.score-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.vitals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.vital-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
}

.vital-value {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.vital-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.vital-threshold {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.insights-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.insight-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.insight-icon {
  font-size: 1.25rem;
}

.insight-text {
  color: var(--text-color);
  font-size: 0.875rem;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.resource-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.resource-value {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.resource-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.component-list,
.route-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.component-card,
.route-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
}

.component-header,
.route-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.component-name,
.route-path {
  font-weight: bold;
  color: var(--text-color);
}

.priority-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

.priority-high {
  background: var(--error-color);
  color: white;
}

.priority-medium {
  background: var(--warning-color);
  color: white;
}

.priority-low {
  background: var(--success-color);
  color: white;
}

.preloaded-badge {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.component-metrics,
.route-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
}

.metric {
  display: flex;
  justify-content: space-between;
}

.metric-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.metric-value {
  color: var(--text-color);
  font-weight: bold;
  font-size: 0.875rem;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setting-group {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  color: var(--text-color);
  margin-bottom: 0.5rem;
}

.setting-select,
.setting-input {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.375rem 0.75rem;
  color: var(--text-color);
  margin-left: 0.5rem;
}

.setting-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

@media (max-width: 768px) {
  .performance-dashboard {
    max-height: 95vh;
  }
  
  .dashboard-tabs {
    overflow-x: auto;
  }
  
  .tab-button {
    white-space: nowrap;
    padding: 1rem;
  }
  
  .score-grid,
  .vitals-grid,
  .resource-grid {
    grid-template-columns: 1fr;
  }
  
  .component-metrics,
  .route-metrics {
    grid-template-columns: 1fr;
  }
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}