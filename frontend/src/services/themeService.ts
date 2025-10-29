/**
 * Theme Service
 * 
 * Manages user theme preferences including dark mode, with system preference
 * detection and accessibility-compliant color schemes
 */

export type ThemeMode = 'light' | 'dark' | 'auto'

export interface ThemePreferences {
  mode: ThemeMode
  reduceMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large'
  lastUpdated: Date
}

export interface ThemeColors {
  // Background colors
  background: string
  backgroundSecondary: string
  backgroundTertiary: string
  
  // Text colors
  text: string
  textSecondary: string
  textMuted: string
  
  // Interactive colors
  primary: string
  primaryHover: string
  secondary: string
  secondaryHover: string
  
  // Status colors
  success: string
  warning: string
  error: string
  info: string
  
  // Border and shadow
  border: string
  borderSecondary: string
  shadow: string
  shadowLight: string
  
  // Special colors
  crisis: string
  sobriety: string
  milestone: string
}

export class ThemeService {
  private readonly STORAGE_KEY = 'aa_theme_preferences'
  private readonly CSS_VARS_PREFIX = '--ds'
  
  private currentTheme: ThemeMode = 'auto'
  private preferences: ThemePreferences
  private mediaQuery: MediaQueryList
  private observers: Set<(theme: ThemeMode, preferences: ThemePreferences) => void> = new Set()

  constructor() {
    this.preferences = this.loadPreferences()
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    this.initialize()
  }

  /**
   * Initialize theme service
   */
  private initialize(): void {
    // Apply initial theme
    this.applyTheme(this.preferences.mode)
    
    // Listen for system theme changes
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this))
    
    // Listen for motion preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', this.handleMotionPreferenceChange.bind(this))
    
    // Apply initial motion preference
    if (motionQuery.matches && !this.preferences.reduceMotion) {
      this.setReduceMotion(true)
    }
    
    console.log('🎨 Theme service initialized:', this.preferences.mode)
  }

  /**
   * Get current theme preferences
   */
  getPreferences(): ThemePreferences {
    return { ...this.preferences }
  }

  /**
   * Get current effective theme (resolves 'auto' to actual theme)
   */
  getCurrentTheme(): 'light' | 'dark' {
    if (this.preferences.mode === 'auto') {
      return this.mediaQuery.matches ? 'dark' : 'light'
    }
    return this.preferences.mode
  }

  /**
   * Set theme mode
   */
  setTheme(mode: ThemeMode): void {
    this.preferences.mode = mode
    this.preferences.lastUpdated = new Date()
    this.savePreferences()
    this.applyTheme(mode)
    this.notifyObservers()
    
    console.log('🎨 Theme changed to:', mode)
  }

  /**
   * Toggle between light and dark (skips auto)
   */
  toggleTheme(): void {
    const currentEffective = this.getCurrentTheme()
    const newMode = currentEffective === 'light' ? 'dark' : 'light'
    this.setTheme(newMode)
  }

  /**
   * Set reduced motion preference
   */
  setReduceMotion(reduce: boolean): void {
    this.preferences.reduceMotion = reduce
    this.preferences.lastUpdated = new Date()
    this.savePreferences()
    this.applyMotionPreference(reduce)
    this.notifyObservers()
  }

  /**
   * Set high contrast mode
   */
  setHighContrast(highContrast: boolean): void {
    this.preferences.highContrast = highContrast
    this.preferences.lastUpdated = new Date()
    this.savePreferences()
    this.applyHighContrast(highContrast)
    this.notifyObservers()
  }

  /**
   * Set font size preference
   */
  setFontSize(size: ThemePreferences['fontSize']): void {
    this.preferences.fontSize = size
    this.preferences.lastUpdated = new Date()
    this.savePreferences()
    this.applyFontSize(size)
    this.notifyObservers()
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(callback: (theme: ThemeMode, preferences: ThemePreferences) => void): () => void {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }

  /**
   * Get theme colors for current theme
   */
  getThemeColors(): ThemeColors {
    const isDark = this.getCurrentTheme() === 'dark'
    const isHighContrast = this.preferences.highContrast

    if (isDark) {
      return this.getDarkThemeColors(isHighContrast)
    } else {
      return this.getLightThemeColors(isHighContrast)
    }
  }

  // Private methods

  private loadPreferences(): ThemePreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          ...parsed,
          lastUpdated: new Date(parsed.lastUpdated)
        }
      }
    } catch (error) {
      console.error('Failed to load theme preferences:', error)
    }

    // Default preferences
    return {
      mode: 'auto',
      reduceMotion: false,
      highContrast: false,
      fontSize: 'medium',
      lastUpdated: new Date()
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences))
    } catch (error) {
      console.error('Failed to save theme preferences:', error)
    }
  }

  private applyTheme(mode: ThemeMode): void {
    const effectiveTheme = mode === 'auto' 
      ? (this.mediaQuery.matches ? 'dark' : 'light')
      : mode

    // Apply theme class to document
    document.documentElement.classList.remove('theme-light', 'theme-dark')
    document.documentElement.classList.add(`theme-${effectiveTheme}`)

    // Apply CSS custom properties
    this.applyCSSVariables(effectiveTheme)
    
    // Apply other preferences
    this.applyMotionPreference(this.preferences.reduceMotion)
    this.applyHighContrast(this.preferences.highContrast)
    this.applyFontSize(this.preferences.fontSize)

    this.currentTheme = mode
  }

  private applyCSSVariables(theme: 'light' | 'dark'): void {
    const colors = theme === 'dark' 
      ? this.getDarkThemeColors(this.preferences.highContrast)
      : this.getLightThemeColors(this.preferences.highContrast)

    const root = document.documentElement

    // Apply color variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`${this.CSS_VARS_PREFIX}-${this.kebabCase(key)}`, value)
    })
  }

  private applyMotionPreference(reduce: boolean): void {
    document.documentElement.classList.toggle('reduce-motion', reduce)
  }

  private applyHighContrast(highContrast: boolean): void {
    document.documentElement.classList.toggle('high-contrast', highContrast)
    // Reapply colors if high contrast changed
    this.applyCSSVariables(this.getCurrentTheme())
  }

  private applyFontSize(size: ThemePreferences['fontSize']): void {
    document.documentElement.classList.remove('font-small', 'font-medium', 'font-large')
    document.documentElement.classList.add(`font-${size}`)
  }

  private handleSystemThemeChange(): void {
    if (this.preferences.mode === 'auto') {
      this.applyTheme('auto')
      this.notifyObservers()
    }
  }

  private handleMotionPreferenceChange(event: MediaQueryListEvent): void {
    if (event.matches && !this.preferences.reduceMotion) {
      this.setReduceMotion(true)
    }
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => {
      try {
        callback(this.currentTheme, this.preferences)
      } catch (error) {
        console.error('Theme observer error:', error)
      }
    })
  }

  private getLightThemeColors(highContrast: boolean): ThemeColors {
    if (highContrast) {
      return {
        background: '#ffffff',
        backgroundSecondary: '#f8f9fa',
        backgroundTertiary: '#e9ecef',
        text: '#000000',
        textSecondary: '#000000',
        textMuted: '#333333',
        primary: '#0000ff',
        primaryHover: '#0000cc',
        secondary: '#666666',
        secondaryHover: '#333333',
        success: '#006600',
        warning: '#cc6600',
        error: '#cc0000',
        info: '#0066cc',
        border: '#000000',
        borderSecondary: '#666666',
        shadow: 'rgba(0, 0, 0, 0.8)',
        shadowLight: 'rgba(0, 0, 0, 0.4)',
        crisis: '#cc0000',
        sobriety: '#006600',
        milestone: '#cc6600'
      }
    }

    return {
      background: '#ffffff',
      backgroundSecondary: '#f8f9fa',
      backgroundTertiary: '#e9ecef',
      text: '#212529',
      textSecondary: '#495057',
      textMuted: '#6c757d',
      primary: '#0d6efd',
      primaryHover: '#0b5ed7',
      secondary: '#6c757d',
      secondaryHover: '#5c636a',
      success: '#198754',
      warning: '#fd7e14',
      error: '#dc3545',
      info: '#0dcaf0',
      border: '#dee2e6',
      borderSecondary: '#e9ecef',
      shadow: 'rgba(0, 0, 0, 0.15)',
      shadowLight: 'rgba(0, 0, 0, 0.075)',
      crisis: '#dc3545',
      sobriety: '#198754',
      milestone: '#fd7e14'
    }
  }

  private getDarkThemeColors(highContrast: boolean): ThemeColors {
    if (highContrast) {
      return {
        background: '#000000',
        backgroundSecondary: '#111111',
        backgroundTertiary: '#222222',
        text: '#ffffff',
        textSecondary: '#ffffff',
        textMuted: '#cccccc',
        primary: '#66b3ff',
        primaryHover: '#3399ff',
        secondary: '#999999',
        secondaryHover: '#cccccc',
        success: '#66ff66',
        warning: '#ffcc66',
        error: '#ff6666',
        info: '#66ccff',
        border: '#ffffff',
        borderSecondary: '#999999',
        shadow: 'rgba(255, 255, 255, 0.3)',
        shadowLight: 'rgba(255, 255, 255, 0.15)',
        crisis: '#ff6666',
        sobriety: '#66ff66',
        milestone: '#ffcc66'
      }
    }

    return {
      background: '#0d1117',
      backgroundSecondary: '#161b22',
      backgroundTertiary: '#21262d',
      text: '#c9d1d9',
      textSecondary: '#8b949e',
      textMuted: '#6e7681',
      primary: '#58a6ff',
      primaryHover: '#388bfd',
      secondary: '#6e7681',
      secondaryHover: '#8b949e',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
      info: '#58a6ff',
      border: '#30363d',
      borderSecondary: '#21262d',
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowLight: 'rgba(0, 0, 0, 0.15)',
      crisis: '#f85149',
      sobriety: '#3fb950',
      milestone: '#d29922'
    }
  }

  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
  }
}

export default new ThemeService()