import { useState, useEffect, useCallback } from 'react'
import performanceService, { 
  type PerformanceMetrics, 
  type PerformanceConfig,
  type ComponentPerformance,
  type RoutePerformance
} from '@/services/performanceService'

/**
 * Performance Hook
 * 
 * React hook for monitoring and optimizing application performance
 */
export function usePerformance() {
  const [latestMetrics, setLatestMetrics] = useState<PerformanceMetrics | null>(
    performanceService.getLatestMetrics()
  )
  const [config, setConfig] = useState<PerformanceConfig>(
    performanceService.getConfig()
  )

  useEffect(() => {
    // Subscribe to performance metrics updates
    const unsubscribe = performanceService.subscribe((metrics) => {
      setLatestMetrics(metrics)
    })

    return unsubscribe
  }, [])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<PerformanceConfig>) => {
    performanceService.updateConfig(newConfig)
    setConfig(performanceService.getConfig())
  }, [])

  // Collect current metrics
  const collectMetrics = useCallback(async (): Promise<PerformanceMetrics> => {
    return await performanceService.collectMetrics()
  }, [])

  // Record component performance
  const recordComponentPerformance = useCallback((
    name: string, 
    mountTime: number, 
    renderTime?: number
  ) => {
    performanceService.recordComponentPerformance(name, mountTime, renderTime)
  }, [])

  // Record component error
  const recordComponentError = useCallback((componentName: string) => {
    performanceService.recordComponentError(componentName)
  }, [])

  // Start route navigation
  const startRouteNavigation = useCallback((path: string) => {
    performanceService.startRouteNavigation(path)
  }, [])

  // End route navigation
  const endRouteNavigation = useCallback((path: string) => {
    performanceService.endRouteNavigation(path)
  }, [])

  // Preload route
  const preloadRoute = useCallback(async (path: string, priority: 'high' | 'low' = 'low') => {
    await performanceService.preloadRoute(path, priority)
  }, [])

  // Perform intelligent preloading
  const performIntelligentPreloading = useCallback(async () => {
    await performanceService.performIntelligentPreloading()
  }, [])

  // Optimize bundle
  const optimizeBundle = useCallback(async () => {
    await performanceService.optimizeBundle()
  }, [])

  // Get metrics history
  const getMetricsHistory = useCallback((limit?: number) => {
    return performanceService.getMetricsHistory(limit)
  }, [])

  // Get component metrics
  const getComponentMetrics = useCallback((): ComponentPerformance[] => {
    return performanceService.getComponentMetrics()
  }, [])

  // Get route metrics
  const getRouteMetrics = useCallback((): RoutePerformance[] => {
    return performanceService.getRouteMetrics()
  }, [])

  // Get performance insights
  const getPerformanceInsights = useCallback((): string[] => {
    return performanceService.getPerformanceInsights()
  }, [])

  return {
    // State
    latestMetrics,
    config,
    
    // Actions
    updateConfig,
    collectMetrics,
    recordComponentPerformance,
    recordComponentError,
    startRouteNavigation,
    endRouteNavigation,
    preloadRoute,
    performIntelligentPreloading,
    optimizeBundle,
    
    // Data getters
    getMetricsHistory,
    getComponentMetrics,
    getRouteMetrics,
    getPerformanceInsights,
    
    // Convenience getters
    isMonitoring: config.enableMetrics,
    isPreloadingEnabled: config.enablePreloading,
    isBundleOptimizationEnabled: config.bundleOptimization,
    
    // Performance scores
    performanceScore: latestMetrics ? Math.round(latestMetrics.responsiveness) : 0,
    webVitalsScore: latestMetrics ? calculateWebVitalsScore(latestMetrics) : 0
  }
}

/**
 * Calculate Web Vitals score based on Core Web Vitals
 */
function calculateWebVitalsScore(metrics: PerformanceMetrics): number {
  let score = 100
  
  // LCP scoring (0-2.5s = good, 2.5-4s = needs improvement, >4s = poor)
  if (metrics.lcp) {
    if (metrics.lcp > 4000) score -= 30
    else if (metrics.lcp > 2500) score -= 15
  }
  
  // FID scoring (0-100ms = good, 100-300ms = needs improvement, >300ms = poor)
  if (metrics.fid) {
    if (metrics.fid > 300) score -= 25
    else if (metrics.fid > 100) score -= 10
  }
  
  // CLS scoring (0-0.1 = good, 0.1-0.25 = needs improvement, >0.25 = poor)
  if (metrics.cls) {
    if (metrics.cls > 0.25) score -= 25
    else if (metrics.cls > 0.1) score -= 10
  }
  
  // Error rate impact
  if (metrics.errorRate > 5) score -= 20
  else if (metrics.errorRate > 1) score -= 10
  
  return Math.max(0, score)
}

/**
 * Performance Monitor HOC
 * 
 * Higher-order component that automatically tracks component performance
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component'
  
  const PerformanceMonitoredComponent = (props: P) => {
    const { recordComponentPerformance, recordComponentError } = usePerformance()
    const [mountTime] = useState(() => performance.now())
    
    useEffect(() => {
      const endTime = performance.now()
      const totalMountTime = endTime - mountTime
      
      recordComponentPerformance(displayName, totalMountTime)
    }, [mountTime, recordComponentPerformance])
    
    // Error boundary for component
    useEffect(() => {
      const handleError = () => {
        recordComponentError(displayName)
      }
      
      window.addEventListener('error', handleError)
      window.addEventListener('unhandledrejection', handleError)
      
      return () => {
        window.removeEventListener('error', handleError)
        window.removeEventListener('unhandledrejection', handleError)
      }
    }, [recordComponentError])
    
    try {
      return <WrappedComponent {...props} />
    } catch (error) {
      recordComponentError(displayName)
      throw error
    }
  }
  
  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${displayName})`
  
  return PerformanceMonitoredComponent
}

/**
 * Route Performance Hook
 * 
 * Hook for tracking route-specific performance
 */
export function useRoutePerformance(routePath: string) {
  const { startRouteNavigation, endRouteNavigation, preloadRoute } = usePerformance()
  
  useEffect(() => {
    startRouteNavigation(routePath)
    
    // End navigation tracking when component mounts
    const endTime = setTimeout(() => {
      endRouteNavigation(routePath)
    }, 0)
    
    return () => clearTimeout(endTime)
  }, [routePath, startRouteNavigation, endRouteNavigation])
  
  const preloadRelatedRoutes = useCallback(async (routes: string[]) => {
    for (const route of routes) {
      await preloadRoute(route, 'low')
    }
  }, [preloadRoute])
  
  return {
    preloadRelatedRoutes
  }
}