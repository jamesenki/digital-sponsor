import { useState, useEffect } from 'react'
import themeService, { type ThemeMode, type ThemePreferences, type ThemeColors } from '@/services/themeService'

/**
 * Theme Hook
 * 
 * React hook for managing theme state and preferences
 */
export function useTheme() {
  const [currentMode, setCurrentMode] = useState<ThemeMode>(themeService.getPreferences().mode)
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(themeService.getCurrentTheme())
  const [preferences, setPreferences] = useState<ThemePreferences>(themeService.getPreferences())
  const [colors, setColors] = useState<ThemeColors>(themeService.getThemeColors())

  useEffect(() => {
    // Subscribe to theme changes
    const unsubscribe = themeService.subscribe((mode, prefs) => {
      setCurrentMode(mode)
      setCurrentTheme(themeService.getCurrentTheme())
      setPreferences(prefs)
      setColors(themeService.getThemeColors())
    })

    return unsubscribe
  }, [])

  const setTheme = (mode: ThemeMode) => {
    themeService.setTheme(mode)
  }

  const toggleTheme = () => {
    themeService.toggleTheme()
  }

  const setReduceMotion = (reduce: boolean) => {
    themeService.setReduceMotion(reduce)
  }

  const setHighContrast = (highContrast: boolean) => {
    themeService.setHighContrast(highContrast)
  }

  const setFontSize = (size: ThemePreferences['fontSize']) => {
    themeService.setFontSize(size)
  }

  return {
    // Current state
    currentMode,
    currentTheme,
    preferences,
    colors,
    
    // Theme controls
    setTheme,
    toggleTheme,
    
    // Accessibility controls
    setReduceMotion,
    setHighContrast,
    setFontSize,
    
    // Utility
    isDark: currentTheme === 'dark',
    isLight: currentTheme === 'light',
    isAuto: currentMode === 'auto'
  }
}