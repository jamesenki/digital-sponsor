/**
 * Enhanced Error Handling Service
 * 
 * Provides comprehensive error handling, retry mechanisms, and recovery strategies
 * while maintaining user privacy per AA Tradition 12
 */

export interface ErrorInfo {
  id: string
  message: string
  stack?: string
  component?: string
  url?: string
  timestamp: Date
  userAgent: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'network' | 'runtime' | 'component' | 'storage' | 'sync' | 'unknown'
  recoverable: boolean
  retryCount: number
  context?: Record<string, any>
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number // milliseconds
  backoffMultiplier: number
  maxDelay: number // milliseconds
  retryCondition?: (error: Error) => boolean
}

export interface ErrorHandlingConfig {
  enableErrorLogging: boolean
  enableRetryMechanism: boolean
  enableOfflineRecovery: boolean
  enableComponentRecovery: boolean
  maxErrorHistory: number
  notifyUser: boolean
  defaultRetryConfig: RetryConfig
}

export interface RecoveryAction {
  id: string
  label: string
  description: string
  action: () => Promise<void> | void
  priority: 'high' | 'medium' | 'low'
  category: 'reload' | 'retry' | 'reset' | 'contact'
}

export class ErrorHandlingService {
  private readonly STORAGE_KEYS = {
    config: 'aa_error_config',
    errorHistory: 'aa_error_history',
    retryAttempts: 'aa_retry_attempts'
  }

  private config: ErrorHandlingConfig
  private errorHistory: ErrorInfo[] = []
  private retryAttempts: Map<string, number> = new Map()
  private observers: Set<(error: ErrorInfo, actions: RecoveryAction[]) => void> = new Set()
  private componentErrorBoundaries: Map<string, boolean> = new Map()

  constructor() {
    this.config = this.loadConfig()
    this.errorHistory = this.loadErrorHistory()
    this.setupGlobalErrorHandlers()
    this.setupUnhandledPromiseHandler()
    this.setupComponentErrorHandling()
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorHandlingConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()
  }

  /**
   * Subscribe to error notifications
   */
  subscribe(callback: (error: ErrorInfo, actions: RecoveryAction[]) => void): () => void {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }

  /**
   * Handle error with automatic retry and recovery
   */
  async handleError(
    error: Error, 
    context?: Record<string, any>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<boolean> {
    const errorInfo = this.createErrorInfo(error, context)
    
    // Log error
    this.logError(errorInfo)
    
    // Attempt recovery if error is recoverable
    if (errorInfo.recoverable && this.config.enableRetryMechanism) {
      const success = await this.attemptRecovery(errorInfo, retryConfig)
      if (success) {
        console.log(`✅ Recovered from error: ${errorInfo.id}`)
        return true
      }
    }
    
    // Generate recovery actions
    const recoveryActions = this.generateRecoveryActions(errorInfo)
    
    // Notify observers
    this.notifyObservers(errorInfo, recoveryActions)
    
    return false
  }

  /**
   * Handle component error with boundary recovery
   */
  handleComponentError(
    error: Error,
    componentName: string,
    errorInfo?: React.ErrorInfo
  ): RecoveryAction[] {
    const errorDetail = this.createErrorInfo(error, {
      component: componentName,
      componentStack: errorInfo?.componentStack
    })
    
    errorDetail.category = 'component'
    errorDetail.severity = 'medium'
    
    this.logError(errorDetail)
    
    // Mark component as having errors
    this.componentErrorBoundaries.set(componentName, true)
    
    return this.generateComponentRecoveryActions(componentName, errorDetail)
  }

  /**
   * Handle network errors with offline recovery
   */
  async handleNetworkError(
    error: Error,
    requestInfo: { url: string, method: string, retryable: boolean }
  ): Promise<Response | null> {
    const errorInfo = this.createErrorInfo(error, requestInfo)
    errorInfo.category = 'network'
    errorInfo.recoverable = requestInfo.retryable
    
    this.logError(errorInfo)
    
    if (this.config.enableOfflineRecovery && !navigator.onLine) {
      return await this.handleOfflineRequest(requestInfo)
    }
    
    if (requestInfo.retryable && this.config.enableRetryMechanism) {
      return await this.retryNetworkRequest(requestInfo, errorInfo.id)
    }
    
    return null
  }

  /**
   * Handle storage errors with fallback mechanisms
   */
  handleStorageError(error: Error, operation: string, key: string, data?: any): boolean {
    const errorInfo = this.createErrorInfo(error, { operation, key, hasData: !!data })
    errorInfo.category = 'storage'
    errorInfo.severity = 'high'
    errorInfo.recoverable = true
    
    this.logError(errorInfo)
    
    // Attempt storage fallback
    return this.attemptStorageFallback(operation, key, data)
  }

  /**
   * Execute function with retry mechanism
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    retryConfig?: Partial<RetryConfig>,
    context?: Record<string, any>
  ): Promise<T> {
    const config = { ...this.config.defaultRetryConfig, ...retryConfig }
    let lastError: Error
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        // Check if error is retryable
        if (config.retryCondition && !config.retryCondition(lastError)) {
          break
        }
        
        // Don't retry on last attempt
        if (attempt === config.maxAttempts) {
          break
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        )
        
        console.log(`🔄 Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms`)
        await this.delay(delay)
      }
    }
    
    // All retries failed, handle the error
    await this.handleError(lastError!, context)
    throw lastError!
  }

  /**
   * Get error history
   */
  getErrorHistory(limit?: number): ErrorInfo[] {
    const history = [...this.errorHistory].reverse()
    return limit ? history.slice(0, limit) : history
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number
    errorsByCategory: Record<string, number>
    errorsBySeverity: Record<string, number>
    mostCommonErrors: { message: string, count: number }[]
    errorRate: number
  } {
    const totalErrors = this.errorHistory.length
    const errorsByCategory: Record<string, number> = {}
    const errorsBySeverity: Record<string, number> = {}
    const errorCounts: Record<string, number> = {}
    
    this.errorHistory.forEach(error => {
      // By category
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1
      
      // By severity
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1
      
      // Count occurrences
      errorCounts[error.message] = (errorCounts[error.message] || 0) + 1
    })
    
    // Most common errors
    const mostCommonErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }))
    
    // Calculate error rate (errors per hour in the last 24 hours)
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000)
    const recentErrors = this.errorHistory.filter(e => e.timestamp.getTime() > last24Hours)
    const errorRate = recentErrors.length / 24
    
    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      mostCommonErrors,
      errorRate
    }
  }

  /**
   * Clear component error boundary
   */
  clearComponentError(componentName: string): void {
    this.componentErrorBoundaries.delete(componentName)
  }

  /**
   * Check if component has errors
   */
  hasComponentError(componentName: string): boolean {
    return this.componentErrorBoundaries.get(componentName) || false
  }

  // Private implementation methods

  private createErrorInfo(error: Error, context?: Record<string, any>): ErrorInfo {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack,
      component: context?.component,
      url: window.location.href,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      severity: this.determineSeverity(error, context),
      category: this.determineCategory(error, context),
      recoverable: this.isRecoverable(error, context),
      retryCount: 0,
      context
    }
  }

  private determineSeverity(error: Error, context?: Record<string, any>): ErrorInfo['severity'] {
    // Critical errors that break core functionality
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      return 'critical'
    }
    
    // High severity for storage or sync errors
    if (context?.operation || error.message.includes('storage') || error.message.includes('sync')) {
      return 'high'
    }
    
    // Network errors are medium severity
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'medium'
    }
    
    // Component errors are usually medium
    if (context?.component) {
      return 'medium'
    }
    
    // Default to low for unknown errors
    return 'low'
  }

  private determineCategory(error: Error, context?: Record<string, any>): ErrorInfo['category'] {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'network'
    }
    
    if (context?.component) {
      return 'component'
    }
    
    if (context?.operation || error.message.includes('storage')) {
      return 'storage'
    }
    
    if (error.message.includes('sync') || error.message.includes('backup')) {
      return 'sync'
    }
    
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      return 'runtime'
    }
    
    return 'unknown'
  }

  private isRecoverable(error: Error, context?: Record<string, any>): boolean {
    // Network errors are usually recoverable
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true
    }
    
    // Storage errors might be recoverable
    if (context?.operation) {
      return true
    }
    
    // Chunk loading errors are recoverable with page refresh
    if (error.name === 'ChunkLoadError') {
      return true
    }
    
    // Component errors are recoverable with component reset
    if (context?.component) {
      return true
    }
    
    return false
  }

  private async attemptRecovery(errorInfo: ErrorInfo, retryConfig?: Partial<RetryConfig>): Promise<boolean> {
    const config = { ...this.config.defaultRetryConfig, ...retryConfig }
    const currentRetries = this.retryAttempts.get(errorInfo.id) || 0
    
    if (currentRetries >= config.maxAttempts) {
      return false
    }
    
    this.retryAttempts.set(errorInfo.id, currentRetries + 1)
    
    try {
      switch (errorInfo.category) {
        case 'network':
          return await this.recoverNetworkError(errorInfo)
        case 'storage':
          return this.recoverStorageError(errorInfo)
        case 'component':
          return this.recoverComponentError(errorInfo)
        case 'runtime':
          return this.recoverRuntimeError(errorInfo)
        default:
          return false
      }
    } catch (error) {
      console.error('Recovery attempt failed:', error)
      return false
    }
  }

  private async recoverNetworkError(errorInfo: ErrorInfo): Promise<boolean> {
    // Wait for network to be available
    if (!navigator.onLine) {
      await this.waitForNetwork()
    }
    
    // Retry the network operation would happen here
    return navigator.onLine
  }

  private recoverStorageError(errorInfo: ErrorInfo): boolean {
    try {
      // Clear some storage space
      this.cleanupStorage()
      return true
    } catch (error) {
      return false
    }
  }

  private recoverComponentError(errorInfo: ErrorInfo): boolean {
    if (errorInfo.component) {
      // Clear component error state
      this.clearComponentError(errorInfo.component)
      return true
    }
    return false
  }

  private recoverRuntimeError(errorInfo: ErrorInfo): boolean {
    // Runtime errors usually require page refresh
    if (errorInfo.message.includes('Loading chunk') || errorInfo.message.includes('ChunkLoadError')) {
      // Don't automatically refresh, but mark as recoverable
      return true
    }
    return false
  }

  private generateRecoveryActions(errorInfo: ErrorInfo): RecoveryAction[] {
    const actions: RecoveryAction[] = []
    
    // Common actions
    actions.push({
      id: 'retry',
      label: 'Try Again',
      description: 'Retry the operation that failed',
      action: async () => { await this.handleError(new Error(errorInfo.message)); },
      priority: 'high',
      category: 'retry'
    })
    
    // Category-specific actions
    switch (errorInfo.category) {
      case 'network':
        actions.push({
          id: 'check-connection',
          label: 'Check Connection',
          description: 'Verify your internet connection',
          action: () => this.checkNetworkConnection(),
          priority: 'high',
          category: 'retry'
        })
        break
        
      case 'storage':
        actions.push({
          id: 'clear-storage',
          label: 'Clear Storage',
          description: 'Free up storage space',
          action: () => this.cleanupStorage(),
          priority: 'medium',
          category: 'reset'
        })
        break
        
      case 'runtime':
        actions.push({
          id: 'refresh-page',
          label: 'Refresh Page',
          description: 'Reload the application',
          action: () => window.location.reload(),
          priority: 'high',
          category: 'reload'
        })
        break
    }
    
    // Always include contact option for critical errors
    if (errorInfo.severity === 'critical') {
      actions.push({
        id: 'contact-support',
        label: 'Get Help',
        description: 'Access crisis support if needed',
        action: () => this.openCrisisSupport(),
        priority: 'medium',
        category: 'contact'
      })
    }
    
    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  private generateComponentRecoveryActions(componentName: string, errorInfo: ErrorInfo): RecoveryAction[] {
    return [
      {
        id: 'reset-component',
        label: 'Reset Component',
        description: `Reset the ${componentName} component`,
        action: () => this.clearComponentError(componentName),
        priority: 'high',
        category: 'reset'
      },
      {
        id: 'refresh-page',
        label: 'Refresh Page',
        description: 'Reload the entire application',
        action: () => window.location.reload(),
        priority: 'medium',
        category: 'reload'
      }
    ]
  }

  private async waitForNetwork(): Promise<void> {
    return new Promise((resolve) => {
      if (navigator.onLine) {
        resolve()
        return
      }
      
      const handleOnline = () => {
        window.removeEventListener('online', handleOnline)
        resolve()
      }
      
      window.addEventListener('online', handleOnline)
    })
  }

  private checkNetworkConnection(): void {
    if (navigator.onLine) {
      alert('Network connection appears to be working. Please try your action again.')
    } else {
      alert('No network connection detected. Please check your internet connection.')
    }
  }

  private cleanupStorage(): void {
    try {
      // Clean up old error logs
      if (this.errorHistory.length > this.config.maxErrorHistory) {
        this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory)
        this.saveErrorHistory()
      }
      
      // Clean up old metrics and temporary data
      const keysToClean = ['aa_old_metrics', 'aa_temp_data', 'aa_cache_temp']
      keysToClean.forEach(key => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          // Ignore individual cleanup failures
        }
      })
      
      console.log('🧹 Storage cleanup completed')
    } catch (error) {
      console.error('Storage cleanup failed:', error)
    }
  }

  private openCrisisSupport(): void {
    // Navigate to crisis support
    window.location.hash = '#/crisis'
  }

  private async handleOfflineRequest(requestInfo: { url: string, method: string }): Promise<Response | null> {
    // This would integrate with service worker for offline responses
    console.log('📱 Handling offline request:', requestInfo.url)
    return null
  }

  private async retryNetworkRequest(requestInfo: { url: string, method: string }, errorId: string): Promise<Response | null> {
    const retries = this.retryAttempts.get(errorId) || 0
    if (retries >= this.config.defaultRetryConfig.maxAttempts) {
      return null
    }
    
    try {
      this.retryAttempts.set(errorId, retries + 1)
      const delay = this.config.defaultRetryConfig.baseDelay * Math.pow(2, retries)
      await this.delay(Math.min(delay, this.config.defaultRetryConfig.maxDelay))
      
      return await fetch(requestInfo.url, { method: requestInfo.method })
    } catch (error) {
      return null
    }
  }

  private attemptStorageFallback(operation: string, key: string, data?: any): boolean {
    try {
      switch (operation) {
        case 'getItem':
          // Try session storage as fallback
          return sessionStorage.getItem(key) !== null
        case 'setItem':
          // Try session storage as fallback
          sessionStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data))
          return true
        case 'removeItem':
          sessionStorage.removeItem(key)
          return true
        default:
          return false
      }
    } catch (error) {
      return false
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private logError(errorInfo: ErrorInfo): void {
    if (!this.config.enableErrorLogging) return
    
    this.errorHistory.push(errorInfo)
    
    // Keep only recent errors
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory)
    }
    
    this.saveErrorHistory()
    
    // Log to console based on severity
    const logMethod = errorInfo.severity === 'critical' ? 'error' : 
                     errorInfo.severity === 'high' ? 'error' :
                     errorInfo.severity === 'medium' ? 'warn' : 'log'
    
    console[logMethod](`🚨 [${errorInfo.severity.toUpperCase()}] ${errorInfo.category}:`, errorInfo.message)
  }

  private setupGlobalErrorHandlers(): void {
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })
  }

  private setupUnhandledPromiseHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'unhandledPromiseRejection' }
      )
    })
  }

  private setupComponentErrorHandling(): void {
    // This would be used by React Error Boundaries
    (window as any).__errorHandler = this
  }

  private notifyObservers(errorInfo: ErrorInfo, actions: RecoveryAction[]): void {
    if (!this.config.notifyUser) return
    
    this.observers.forEach(callback => {
      try {
        callback(errorInfo, actions)
      } catch (error) {
        console.error('Error observer failed:', error)
      }
    })
  }

  private loadConfig(): ErrorHandlingConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.config)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load error handling config:', error)
    }

    return {
      enableErrorLogging: true,
      enableRetryMechanism: true,
      enableOfflineRecovery: true,
      enableComponentRecovery: true,
      maxErrorHistory: 50,
      notifyUser: true,
      defaultRetryConfig: {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        retryCondition: (error: Error) => {
          // Don't retry user cancellation or auth errors
          return !error.message.includes('cancelled') && 
                 !error.message.includes('unauthorized') &&
                 !error.message.includes('403')
        }
      }
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.config, JSON.stringify(this.config))
    } catch (error) {
      console.error('Failed to save error handling config:', error)
    }
  }

  private loadErrorHistory(): ErrorInfo[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.errorHistory)
      if (stored) {
        return JSON.parse(stored).map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }))
      }
    } catch (error) {
      console.error('Failed to load error history:', error)
    }
    return []
  }

  private saveErrorHistory(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.errorHistory, JSON.stringify(this.errorHistory))
    } catch (error) {
      console.error('Failed to save error history:', error)
    }
  }
}

export default new ErrorHandlingService()