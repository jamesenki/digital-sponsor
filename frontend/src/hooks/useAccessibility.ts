import { useState, useEffect, useCallback } from 'react'
import accessibilityService, { 
  type AccessibilityPreferences, 
  type AnnouncementPriority 
} from '@/services/accessibilityService'

/**
 * Accessibility Hook
 * 
 * React hook for managing accessibility features and announcements
 */
export function useAccessibility() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    accessibilityService.getPreferences()
  )

  useEffect(() => {
    // Subscribe to preference changes
    const unsubscribe = accessibilityService.subscribe((prefs) => {
      setPreferences(prefs)
    })

    return unsubscribe
  }, [])

  // Announcement methods
  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    accessibilityService.announce(message, priority)
  }, [])

  const announcePageChange = useCallback((pageName: string, description?: string) => {
    accessibilityService.announcePageChange(pageName, description)
  }, [])

  const announceFormError = useCallback((fieldName: string, error: string) => {
    accessibilityService.announceFormError(fieldName, error)
  }, [])

  const announceStatus = useCallback((status: string, isError = false) => {
    accessibilityService.announceStatus(status, isError)
  }, [])

  // Focus management methods
  const focusElement = useCallback((selector: string, options?: FocusOptions) => {
    return accessibilityService.focusElement(selector, options)
  }, [])

  const focusFirstInContainer = useCallback((containerSelector: string) => {
    return accessibilityService.focusFirstInContainer(containerSelector)
  }, [])

  const skipToMain = useCallback(() => {
    accessibilityService.skipToMain()
  }, [])

  const skipToNavigation = useCallback(() => {
    accessibilityService.skipToNavigation()
  }, [])

  // Preference management
  const updatePreference = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K, 
    value: AccessibilityPreferences[K]
  ) => {
    accessibilityService.updatePreference(key, value)
  }, [])

  // Utility methods
  const enhanceAriaLabels = useCallback(() => {
    accessibilityService.enhanceAriaLabels()
  }, [])

  const validateAccessibility = useCallback(() => {
    return accessibilityService.validateAccessibility()
  }, [])

  return {
    // State
    preferences,
    
    // Announcements
    announce,
    announcePageChange,
    announceFormError,
    announceStatus,
    
    // Focus management
    focusElement,
    focusFirstInContainer,
    skipToMain,
    skipToNavigation,
    
    // Preferences
    updatePreference,
    
    // Utilities
    enhanceAriaLabels,
    validateAccessibility,
    
    // Convenience flags
    isScreenReaderEnabled: preferences.screenReaderEnabled,
    isKeyboardNavigationEnabled: preferences.keyboardNavigationEnabled,
    isEnhancedFocusEnabled: preferences.enhancedFocus
  }
}