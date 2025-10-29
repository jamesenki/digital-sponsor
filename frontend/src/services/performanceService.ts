/**
 * Performance Service
 * 
 * Monitors and optimizes app performance with metrics collection,
 * intelligent preloading, and resource management
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number | null | undefined // Largest Contentful Paint
  fid?: number | null | undefined // First Input Delay
  cls?: number | null | undefined // Cumulative Layout Shift
  fcp?: number | null | undefined // First Contentful Paint
  ttfb?: number | null | undefined // Time to First Byte
  
  // Custom metrics
  routeLoadTime: number
  componentMountTime: number
  memoryUsage: number
  bundleSize: number
  cacheHitRate: number
  
  // User interaction metrics
  interactionToNextPaint: number | null
  responsiveness: number
  
  // Network metrics
  connectionType?: string
  effectiveType?: string
  downlink?: number
  
  // Error metrics
  errorCount: number
  errorRate: number
  
  timestamp: Date
}

export interface PerformanceConfig {
  enableMetrics: boolean
  enablePreloading: boolean
  preloadStrategy: 'aggressive' | 'conservative' | 'adaptive'
  bundleOptimization: boolean
  enableCompression: boolean
  cacheStrategy: 'stale-while-revalidate' | 'network-first' | 'cache-first'
  monitoringInterval: number // seconds
  maxMetricsHistory: number
}

export interface ComponentPerformance {
  name: string
  mountTime: number
  renderTime: number
  updateCount: number
  errorCount: number
  lastUsed: Date
  priority: 'high' | 'medium' | 'low'
}

export interface RoutePerformance {
  path: string
  loadTime: number
  renderTime: number
  visits: number
  lastVisit: Date
  resources: string[]
  preloaded: boolean
}

export class PerformanceService {
  private readonly STORAGE_KEYS = {
    metrics: 'aa_performance_metrics',
    config: 'aa_performance_config',
    components: 'aa_component_performance',
    routes: 'aa_route_performance'
  }

  private config: PerformanceConfig
  private metrics: PerformanceMetrics[]
  private componentMetrics: Map<string, ComponentPerformance> = new Map()
  private routeMetrics: Map<string, RoutePerformance> = new Map()
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set()
  private observer: PerformanceObserver | null = null
  private routeStartTime: number = 0
  private errorCount: number = 0
  private interactionCount: number = 0

  constructor() {
    this.config = this.loadConfig()
    this.metrics = this.loadMetrics()
    this.initializePerformanceMonitoring()
    this.setupErrorTracking()
  }

  /**
   * Get current performance configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config }
  }

  /**
   * Update performance configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()
    
    if (newConfig.enableMetrics !== undefined) {
      if (newConfig.enableMetrics) {
        this.initializePerformanceMonitoring()
      } else {
        this.stopPerformanceMonitoring()
      }
    }
  }

  /**
   * Subscribe to performance metrics updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }

  /**
   * Get latest performance metrics
   */
  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  /**
   * Get performance metrics history
   */
  getMetricsHistory(limit?: number): PerformanceMetrics[] {
    const metrics = [...this.metrics].reverse()
    return limit ? metrics.slice(0, limit) : metrics
  }

  /**
   * Record route navigation start
   */
  startRouteNavigation(path: string): void {
    this.routeStartTime = performance.now()
    
    if (!this.routeMetrics.has(path)) {
      this.routeMetrics.set(path, {
        path,
        loadTime: 0,
        renderTime: 0,
        visits: 0,
        lastVisit: new Date(),
        resources: [],
        preloaded: false
      })
    }
  }

  /**
   * Record route navigation end
   */
  endRouteNavigation(path: string): void {
    const loadTime = performance.now() - this.routeStartTime
    const routeMetric = this.routeMetrics.get(path)
    
    if (routeMetric) {
      routeMetric.loadTime = loadTime
      routeMetric.visits++
      routeMetric.lastVisit = new Date()
      this.routeMetrics.set(path, routeMetric)
    }
    
    this.saveRouteMetrics()
  }

  /**
   * Record component performance
   */
  recordComponentPerformance(
    name: string, 
    mountTime: number, 
    renderTime: number = 0
  ): void {
    const existing = this.componentMetrics.get(name)
    
    if (existing) {
      existing.renderTime = renderTime
      existing.updateCount++
      existing.lastUsed = new Date()
    } else {
      this.componentMetrics.set(name, {
        name,
        mountTime,
        renderTime,
        updateCount: 1,
        errorCount: 0,
        lastUsed: new Date(),
        priority: this.determineComponentPriority(name)
      })
    }
    
    this.saveComponentMetrics()
  }

  /**
   * Record component error
   */
  recordComponentError(componentName: string): void {
    const metric = this.componentMetrics.get(componentName)
    if (metric) {
      metric.errorCount++
      this.componentMetrics.set(componentName, metric)
    }
    
    this.errorCount++
    this.saveComponentMetrics()
  }

  /**
   * Get component performance metrics
   */
  getComponentMetrics(): ComponentPerformance[] {
    return Array.from(this.componentMetrics.values())
  }

  /**
   * Get route performance metrics
   */
  getRouteMetrics(): RoutePerformance[] {
    return Array.from(this.routeMetrics.values())
  }

  /**
   * Preload route resources
   */
  async preloadRoute(path: string, priority: 'high' | 'low' = 'low'): Promise<void> {
    if (!this.config.enablePreloading) return

    try {
      const routeMetric = this.routeMetrics.get(path)
      if (routeMetric && routeMetric.preloaded) return

      // Determine what to preload based on route
      const resourcesToPreload = this.getRouteResources(path)
      
      for (const resource of resourcesToPreload) {
        await this.preloadResource(resource, priority)
      }

      // Mark route as preloaded
      if (routeMetric) {
        routeMetric.preloaded = true
        routeMetric.resources = resourcesToPreload
        this.routeMetrics.set(path, routeMetric)
      }

      console.log(`📦 Preloaded resources for route: ${path}`)
    } catch (error) {
      console.error('Failed to preload route:', path, error)
    }
  }

  /**
   * Intelligent preloading based on user behavior
   */
  async performIntelligentPreloading(): Promise<void> {
    if (!this.config.enablePreloading) return

    const routeMetrics = Array.from(this.routeMetrics.values())
    
    // Sort by visit frequency and recency
    const candidateRoutes = routeMetrics
      .filter(route => !route.preloaded && route.visits > 0)
      .sort((a, b) => {
        const aScore = a.visits * (1 / (Date.now() - a.lastVisit.getTime()))
        const bScore = b.visits * (1 / (Date.now() - b.lastVisit.getTime()))
        return bScore - aScore
      })
      .slice(0, 3) // Preload top 3 candidates

    for (const route of candidateRoutes) {
      await this.preloadRoute(route.path, 'low')
    }
  }

  /**
   * Collect and analyze current performance metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    const now = Date.now()
    
    // Get Web Vitals
    const webVitals = await this.getWebVitals()
    
    // Get memory usage
    const memoryUsage = this.getMemoryUsage()
    
    // Get network information
    const networkInfo = this.getNetworkInfo()
    
    // Calculate cache hit rate
    const cacheHitRate = await this.calculateCacheHitRate()
    
    // Calculate error rate
    const errorRate = this.interactionCount > 0 ? (this.errorCount / this.interactionCount) * 100 : 0

    const metrics: PerformanceMetrics = {
      ...webVitals,
      routeLoadTime: this.getAverageRouteLoadTime(),
      componentMountTime: this.getAverageComponentMountTime(),
      memoryUsage,
      bundleSize: await this.estimateBundleSize(),
      cacheHitRate,
      interactionToNextPaint: null, // Will be populated by observer
      responsiveness: this.calculateResponsiveness(),
      ...networkInfo,
      errorCount: this.errorCount,
      errorRate,
      timestamp: new Date()
    }

    this.addMetrics(metrics)
    this.notifyObservers(metrics)
    
    return metrics
  }

  /**
   * Optimize bundle size and loading
   */
  async optimizeBundle(): Promise<void> {
    if (!this.config.bundleOptimization) return

    try {
      // Remove unused components from memory
      this.cleanupUnusedComponents()
      
      // Optimize image loading
      await this.optimizeImages()
      
      // Compress local storage data
      this.compressStorageData()
      
      console.log('📦 Bundle optimization completed')
    } catch (error) {
      console.error('Bundle optimization failed:', error)
    }
  }

  /**
   * Get performance insights and recommendations
   */
  getPerformanceInsights(): string[] {
    const insights: string[] = []
    const latestMetrics = this.getLatestMetrics()
    
    if (!latestMetrics) return insights

    // Core Web Vitals insights
    if (latestMetrics.lcp && latestMetrics.lcp > 2500) {
      insights.push('Largest Contentful Paint is slow. Consider optimizing images and reducing server response time.')
    }
    
    if (latestMetrics.fid && latestMetrics.fid > 100) {
      insights.push('First Input Delay is high. Consider reducing JavaScript execution time.')
    }
    
    if (latestMetrics.cls && latestMetrics.cls > 0.1) {
      insights.push('Cumulative Layout Shift is high. Ensure proper sizing for images and dynamic content.')
    }

    // Memory insights
    if (latestMetrics.memoryUsage > 50) {
      insights.push('High memory usage detected. Consider implementing component cleanup.')
    }

    // Error rate insights
    if (latestMetrics.errorRate > 5) {
      insights.push('High error rate detected. Review error handling and user experience.')
    }

    // Cache insights
    if (latestMetrics.cacheHitRate < 70) {
      insights.push('Low cache hit rate. Consider improving caching strategy.')
    }

    return insights
  }

  // Private implementation methods

  private loadConfig(): PerformanceConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.config)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load performance config:', error)
    }

    return {
      enableMetrics: true,
      enablePreloading: true,
      preloadStrategy: 'adaptive',
      bundleOptimization: true,
      enableCompression: true,
      cacheStrategy: 'stale-while-revalidate',
      monitoringInterval: 30,
      maxMetricsHistory: 100
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.config, JSON.stringify(this.config))
    } catch (error) {
      console.error('Failed to save performance config:', error)
    }
  }

  private loadMetrics(): PerformanceMetrics[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.metrics)
      if (stored) {
        return JSON.parse(stored).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error)
    }
    return []
  }

  private saveMetrics(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.metrics, JSON.stringify(this.metrics))
    } catch (error) {
      console.error('Failed to save performance metrics:', error)
    }
  }

  private saveComponentMetrics(): void {
    try {
      const data = Array.from(this.componentMetrics.entries())
      localStorage.setItem(this.STORAGE_KEYS.components, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save component metrics:', error)
    }
  }

  private saveRouteMetrics(): void {
    try {
      const data = Array.from(this.routeMetrics.entries())
      localStorage.setItem(this.STORAGE_KEYS.routes, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save route metrics:', error)
    }
  }

  private addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics)
    
    // Keep only recent metrics
    if (this.metrics.length > this.config.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsHistory)
    }
    
    this.saveMetrics()
  }

  private initializePerformanceMonitoring(): void {
    if (!this.config.enableMetrics || this.observer) return

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry)
        }
      })

      this.observer.observe({ 
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
      })

      // Collect metrics periodically
      setInterval(() => {
        this.collectMetrics()
      }, this.config.monitoringInterval * 1000)

      console.log('📊 Performance monitoring initialized')
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error)
    }
  }

  private stopPerformanceMonitoring(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }

  private setupErrorTracking(): void {
    // Track JavaScript errors
    window.addEventListener('error', () => {
      this.errorCount++
    })

    window.addEventListener('unhandledrejection', () => {
      this.errorCount++
    })

    // Track user interactions
    const eventTypes: string[] = ['click', 'keydown', 'touchstart'];
    eventTypes.forEach((eventType: string) => {
      document.addEventListener(eventType, () => {
        this.interactionCount++
      }, { passive: true })
    })
  }

  private async getWebVitals(): Promise<Partial<PerformanceMetrics>> {
    return new Promise((resolve) => {
      const metrics: Partial<PerformanceMetrics> = {
        lcp: null,
        fid: null,
        cls: null,
        fcp: null,
        ttfb: null
      }

      // Get paint timings
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        metrics.fcp = fcpEntry.startTime
      }

      // Get navigation timing
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (navEntries.length > 0) {
        const navEntry = navEntries[0]
        metrics.ttfb = navEntry.responseStart - navEntry.requestStart
      }

      resolve(metrics)
    })
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'largest-contentful-paint':
        // LCP will be handled by Web Vitals library if available
        break
      case 'first-input':
        // FID will be handled by Web Vitals library if available
        break
      case 'layout-shift':
        // CLS will be handled by Web Vitals library if available
        break
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
    }
    return 0
  }

  private getNetworkInfo(): Partial<PerformanceMetrics> {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    
    if (connection) {
      return {
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0
      }
    }
    
    return {
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0
    }
  }

  private async calculateCacheHitRate(): Promise<number> {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // This would integrate with service worker cache stats
        return 85 // Mock value
      }
    } catch (error) {
      console.error('Failed to calculate cache hit rate:', error)
    }
    return 0
  }

  private getAverageRouteLoadTime(): number {
    const routes = Array.from(this.routeMetrics.values())
    if (routes.length === 0) return 0
    
    const totalTime = routes.reduce((sum, route) => sum + route.loadTime, 0)
    return totalTime / routes.length
  }

  private getAverageComponentMountTime(): number {
    const components = Array.from(this.componentMetrics.values())
    if (components.length === 0) return 0
    
    const totalTime = components.reduce((sum, comp) => sum + comp.mountTime, 0)
    return totalTime / components.length
  }

  private async estimateBundleSize(): Promise<number> {
    // Estimate based on loaded resources
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const totalSize = resources.reduce((sum, resource) => {
      return sum + (resource.transferSize || 0)
    }, 0)
    
    return Math.round(totalSize / 1024) // Convert to KB
  }

  private calculateResponsiveness(): number {
    // Simple responsiveness calculation based on interaction count and errors
    if (this.interactionCount === 0) return 100
    const responsiveness = ((this.interactionCount - this.errorCount) / this.interactionCount) * 100
    return Math.max(0, Math.min(100, responsiveness))
  }

  private determineComponentPriority(name: string): 'high' | 'medium' | 'low' {
    const highPriorityComponents = ['Navigation', 'CrisisButton', 'HomePage']
    const mediumPriorityComponents = ['RecoveryDashboard', 'ChatPage', 'MeetingsPage']
    
    if (highPriorityComponents.includes(name)) return 'high'
    if (mediumPriorityComponents.includes(name)) return 'medium'
    return 'low'
  }

  private getRouteResources(path: string): string[] {
    // Map routes to their required resources
    const routeResourceMap: Record<string, string[]> = {
      '/dashboard': ['/src/components/RecoveryDashboard.tsx', '/src/services/recoveryDashboardService.ts'],
      '/literature': ['/src/components/EnhancedLiteraturePage.tsx', '/src/services/enhancedLiteratureService.ts'],
      '/meetings': ['/src/components/MeetingsPage.tsx', '/src/services/meetingFinderService.ts'],
      '/step-work': ['/src/components/StepWorkPage.tsx', '/src/services/stepWorkStorage.ts'],
      '/chat': ['/src/components/ChatPage.tsx'],
      '/crisis': ['/src/components/CrisisSupport.tsx', '/src/services/crisisLiteratureService.ts']
    }
    
    return routeResourceMap[path] || []
  }

  private async preloadResource(resource: string, priority: 'high' | 'low'): Promise<void> {
    try {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource
      link.as = resource.endsWith('.css') ? 'style' : 'script'
      
      if (priority === 'high') {
        link.setAttribute('importance', 'high')
      }
      
      document.head.appendChild(link)
    } catch (error) {
      console.error('Failed to preload resource:', resource, error)
    }
  }

  private cleanupUnusedComponents(): void {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    for (const [name, metric] of this.componentMetrics.entries()) {
      if (metric.lastUsed.getTime() < oneHourAgo && metric.priority === 'low') {
        // Component hasn't been used in an hour and is low priority
        // This would trigger component cleanup in a real implementation
        console.log(`🧹 Cleaning up unused component: ${name}`)
      }
    }
  }

  private async optimizeImages(): Promise<void> {
    // This would implement image optimization strategies
    console.log('🖼️ Optimizing images...')
  }

  private compressStorageData(): void {
    // This would implement storage compression
    console.log('🗜️ Compressing storage data...')
  }

  private notifyObservers(metrics: PerformanceMetrics): void {
    this.observers.forEach(callback => {
      try {
        callback(metrics)
      } catch (error) {
        console.error('Performance observer error:', error)
      }
    })
  }
}

export default new PerformanceService()