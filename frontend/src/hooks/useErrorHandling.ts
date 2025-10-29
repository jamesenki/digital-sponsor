import { useState, useEffect, useCallback } from 'react'
import errorHandlingService, { 
  type ErrorInfo, 
  type ErrorHandlingConfig, 
  type RecoveryAction,
  type RetryConfig
} from '@/services/errorHandlingService'

/**
 * Error Handling Hook
 * 
 * React hook for managing errors with automatic retry and recovery
 */
export function useErrorHandling() {
  const [config, setConfig] = useState<ErrorHandlingConfig>(
    errorHandlingService.getConfig()
  )
  const [lastError, setLastError] = useState<ErrorInfo | null>(null)
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([])

  useEffect(() => {
    // Subscribe to error notifications
    const unsubscribe = errorHandlingService.subscribe((error, actions) => {
      setLastError(error)
      setRecoveryActions(actions)
    })

    return unsubscribe
  }, [])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<ErrorHandlingConfig>) => {
    errorHandlingService.updateConfig(newConfig)
    setConfig(errorHandlingService.getConfig())
  }, [])

  // Handle error manually
  const handleError = useCallback(async (
    error: Error, 
    context?: Record<string, any>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<boolean> => {
    return await errorHandlingService.handleError(error, context, retryConfig)
  }, [])

  // Handle component error
  const handleComponentError = useCallback((
    error: Error,
    componentName: string,
    errorInfo?: React.ErrorInfo
  ): RecoveryAction[] => {
    return errorHandlingService.handleComponentError(error, componentName, errorInfo)
  }, [])

  // Handle network error
  const handleNetworkError = useCallback(async (
    error: Error,
    requestInfo: { url: string, method: string, retryable: boolean }
  ): Promise<Response | null> => {
    return await errorHandlingService.handleNetworkError(error, requestInfo)
  }, [])

  // Handle storage error
  const handleStorageError = useCallback((
    error: Error, 
    operation: string, 
    key: string, 
    data?: any
  ): boolean => {
    return errorHandlingService.handleStorageError(error, operation, key, data)
  }, [])

  // Execute with retry
  const withRetry = useCallback(async <T>(
    fn: () => Promise<T>,
    retryConfig?: Partial<RetryConfig>,
    context?: Record<string, any>
  ): Promise<T> => {
    return await errorHandlingService.withRetry(fn, retryConfig, context)
  }, [])

  // Get error history
  const getErrorHistory = useCallback((limit?: number) => {
    return errorHandlingService.getErrorHistory(limit)
  }, [])

  // Get error statistics
  const getErrorStatistics = useCallback(() => {
    return errorHandlingService.getErrorStatistics()
  }, [])

  // Clear component error
  const clearComponentError = useCallback((componentName: string) => {
    errorHandlingService.clearComponentError(componentName)
  }, [])

  // Check if component has errors
  const hasComponentError = useCallback((componentName: string) => {
    return errorHandlingService.hasComponentError(componentName)
  }, [])

  // Clear current error
  const clearError = useCallback(() => {
    setLastError(null)
    setRecoveryActions([])
  }, [])

  // Execute recovery action
  const executeRecoveryAction = useCallback(async (actionId: string) => {
    const action = recoveryActions.find(a => a.id === actionId)
    if (action) {
      try {
        await action.action()
        clearError()
      } catch (error) {
        console.error('Recovery action failed:', error)
      }
    }
  }, [recoveryActions, clearError])

  return {
    // State
    config,
    lastError,
    recoveryActions,
    
    // Actions
    updateConfig,
    handleError,
    handleComponentError,
    handleNetworkError,
    handleStorageError,
    withRetry,
    clearError,
    clearComponentError,
    executeRecoveryAction,
    
    // Data getters
    getErrorHistory,
    getErrorStatistics,
    hasComponentError,
    
    // Convenience getters
    hasError: !!lastError,
    errorSeverity: lastError?.severity || 'low',
    isRecoverable: lastError?.recoverable || false
  }
}

/**
 * Error Boundary Hook
 * 
 * Hook for React Error Boundaries with automatic recovery
 */
export function useErrorBoundary(componentName: string) {
  const { handleComponentError, clearComponentError, hasComponentError } = useErrorHandling()
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([])

  const resetErrorBoundary = useCallback(() => {
    setHasError(false)
    setError(null)
    setRecoveryActions([])
    clearComponentError(componentName)
  }, [componentName, clearComponentError])

  const captureError = useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    setHasError(true)
    setError(error)
    
    const actions = handleComponentError(error, componentName, errorInfo)
    setRecoveryActions(actions)
    
    console.error(`Error in ${componentName}:`, error)
  }, [componentName, handleComponentError])

  useEffect(() => {
    // Check if component already has errors
    if (hasComponentError(componentName)) {
      setHasError(true)
    }
  }, [componentName, hasComponentError])

  return {
    hasError,
    error,
    recoveryActions,
    resetErrorBoundary,
    captureError
  }
}

/**
 * Network Request Hook with Error Handling
 * 
 * Hook for making network requests with automatic retry and error handling
 */
export function useNetworkRequest() {
  const { handleNetworkError, withRetry } = useErrorHandling()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const makeRequest = useCallback(async <T>(
    url: string,
    options: RequestInit = {},
    retryConfig?: Partial<RetryConfig>
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await withRetry(
        async () => {
          const res = await fetch(url, options)
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }
          return res
        },
        retryConfig,
        { url, method: options.method || 'GET' }
      )

      const data = await response.json()
      setLoading(false)
      return data
    } catch (err) {
      const error = err as Error
      setError(error)
      setLoading(false)

      // Try to handle network error
      const fallbackResponse = await handleNetworkError(error, {
        url,
        method: options.method || 'GET',
        retryable: true
      })

      if (fallbackResponse) {
        try {
          return await fallbackResponse.json()
        } catch (parseError) {
          return null
        }
      }

      return null
    }
  }, [withRetry, handleNetworkError])

  return {
    makeRequest,
    loading,
    error
  }
}

/**
 * Safe Storage Hook with Error Handling
 * 
 * Hook for localStorage operations with automatic fallback and error handling
 */
export function useSafeStorage() {
  const { handleStorageError } = useErrorHandling()

  const getItem = useCallback((key: string, defaultValue?: any) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      const success = handleStorageError(error as Error, 'getItem', key)
      if (success) {
        try {
          const item = sessionStorage.getItem(key)
          return item ? JSON.parse(item) : defaultValue
        } catch (fallbackError) {
          return defaultValue
        }
      }
      return defaultValue
    }
  }, [handleStorageError])

  const setItem = useCallback((key: string, value: any): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      return handleStorageError(error as Error, 'setItem', key, value)
    }
  }, [handleStorageError])

  const removeItem = useCallback((key: string): boolean => {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      return handleStorageError(error as Error, 'removeItem', key)
    }
  }, [handleStorageError])

  return {
    getItem,
    setItem,
    removeItem
  }
}