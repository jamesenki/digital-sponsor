/**
 * Accessibility Service
 * 
 * Provides comprehensive accessibility features including screen reader announcements,
 * focus management, keyboard navigation, and ARIA support for AA recovery app
 */

export type AnnouncementPriority = 'polite' | 'assertive' | 'off'

export interface AccessibilityPreferences {
  screenReaderEnabled: boolean
  keyboardNavigationEnabled: boolean
  skipLinksEnabled: boolean
  enhancedFocus: boolean
  reduceMotion: boolean
  highContrast: boolean
  announcePageChanges: boolean
  announceFormErrors: boolean
  announceStatusUpdates: boolean
  lastUpdated: Date
}

export interface FocusableElement {
  element: HTMLElement
  selector: string
  label: string
  section: string
}

export class AccessibilityService {
  private readonly STORAGE_KEY = 'aa_accessibility_preferences'
  private preferences: AccessibilityPreferences
  private announceRegion: HTMLElement | null = null
  private skipLinksContainer: HTMLElement | null = null
  private focusableElements: FocusableElement[] = []
  private currentFocusIndex = -1
  private observers: Set<(prefs: AccessibilityPreferences) => void> = new Set()

  constructor() {
    this.preferences = this.loadPreferences()
    this.initialize()
  }

  /**
   * Initialize accessibility features
   */
  private initialize(): void {
    this.createAnnounceRegion()
    this.createSkipLinks()
    this.setupKeyboardNavigation()
    this.enhanceFormAccessibility()
    this.setupFocusManagement()
    
    console.log('♿ Accessibility service initialized')
  }

  /**
   * Get current accessibility preferences
   */
  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences }
  }

  /**
   * Update accessibility preference
   */
  updatePreference<K extends keyof AccessibilityPreferences>(
    key: K, 
    value: AccessibilityPreferences[K]
  ): void {
    this.preferences[key] = value
    this.preferences.lastUpdated = new Date()
    this.savePreferences()
    this.applyPreferences()
    this.notifyObservers()
  }

  /**
   * Subscribe to preference changes
   */
  subscribe(callback: (prefs: AccessibilityPreferences) => void): () => void {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: AnnouncementPriority = 'polite'): void {
    if (!this.preferences.screenReaderEnabled || !this.announceRegion) return

    // Clear previous announcement
    this.announceRegion.textContent = ''
    this.announceRegion.setAttribute('aria-live', priority)
    
    // Add new announcement after brief delay to ensure screen reader picks it up
    setTimeout(() => {
      if (this.announceRegion) {
        this.announceRegion.textContent = message
      }
    }, 100)

    console.log(`📢 Screen reader announcement (${priority}): ${message}`)
  }

  /**
   * Announce page navigation
   */
  announcePageChange(pageName: string, description?: string): void {
    if (!this.preferences.announcePageChanges) return

    const message = description 
      ? `Navigated to ${pageName}. ${description}`
      : `Navigated to ${pageName}`
    
    this.announce(message, 'polite')
  }

  /**
   * Announce form errors
   */
  announceFormError(fieldName: string, error: string): void {
    if (!this.preferences.announceFormErrors) return

    this.announce(`Error in ${fieldName}: ${error}`, 'assertive')
  }

  /**
   * Announce status updates
   */
  announceStatus(status: string, isError = false): void {
    if (!this.preferences.announceStatusUpdates) return

    this.announce(status, isError ? 'assertive' : 'polite')
  }

  /**
   * Focus management - move to specific element
   */
  focusElement(selector: string, options?: FocusOptions): boolean {
    const element = document.querySelector(selector) as HTMLElement
    if (!element) return false

    element.focus(options)
    
    if (this.preferences.enhancedFocus) {
      this.addFocusIndicator(element)
    }

    return true
  }

  /**
   * Focus first element in container
   */
  focusFirstInContainer(containerSelector: string): boolean {
    const container = document.querySelector(containerSelector)
    if (!container) return false

    const focusable = this.getFocusableElements(container as HTMLElement)
    if (focusable.length > 0) {
      focusable[0].focus()
      return true
    }

    return false
  }

  /**
   * Skip to main content
   */
  skipToMain(): void {
    this.focusElement('main, [role="main"], #main-content', { preventScroll: false })
    this.announce('Skipped to main content', 'polite')
  }

  /**
   * Skip to navigation
   */
  skipToNavigation(): void {
    this.focusElement('nav, [role="navigation"], .navigation', { preventScroll: false })
    this.announce('Skipped to navigation', 'polite')
  }

  /**
   * Enhanced keyboard navigation
   */
  handleKeyboardNavigation(event: KeyboardEvent): boolean {
    if (!this.preferences.keyboardNavigationEnabled) return false

    // Global keyboard shortcuts
    switch (event.key) {
      case 'F6':
        // Cycle through main page sections
        this.cycleFocusSections()
        event.preventDefault()
        return true

      case 'Escape':
        // Close modals, menus, etc.
        this.handleEscape()
        event.preventDefault()
        return true

      case 'Tab':
        // Enhanced tab navigation
        if (this.preferences.enhancedFocus) {
          this.handleTabNavigation(event)
        }
        return false

      case '/':
        // Focus search (common pattern)
        if (event.ctrlKey || event.metaKey) {
          this.focusSearch()
          event.preventDefault()
          return true
        }
        return false
    }

    return false
  }

  /**
   * Add ARIA labels to elements
   */
  enhanceAriaLabels(): void {
    // Enhance buttons without proper labels
    document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
      const text = button.textContent?.trim()
      if (text && text.length < 50) {
        button.setAttribute('aria-label', text)
      }
    })

    // Enhance form inputs
    document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`)
      if (label) {
        input.setAttribute('aria-labelledby', label.id || this.generateId('label'))
      }
    })

    // Enhance navigation landmarks
    const nav = document.querySelector('nav:not([role]):not([aria-label])')
    if (nav) {
      nav.setAttribute('role', 'navigation')
      nav.setAttribute('aria-label', 'Main navigation')
    }

    // Enhance main content area
    const main = document.querySelector('main:not([role]):not([aria-label])')
    if (main) {
      main.setAttribute('role', 'main')
      main.setAttribute('aria-label', 'Main content')
    }
  }

  /**
   * Setup form accessibility enhancements
   */
  enhanceFormAccessibility(): void {
    // Add required field indicators
    document.querySelectorAll('input[required], textarea[required], select[required]').forEach(field => {
      if (!field.getAttribute('aria-required')) {
        field.setAttribute('aria-required', 'true')
      }
    })

    // Setup form error announcements
    document.addEventListener('invalid', (event) => {
      const field = event.target as HTMLInputElement
      const fieldName = this.getFieldLabel(field)
      const errorMessage = field.validationMessage
      
      if (fieldName && errorMessage) {
        this.announceFormError(fieldName, errorMessage)
      }
    }, true)
  }

  /**
   * Validate accessibility compliance
   */
  validateAccessibility(): string[] {
    const issues: string[] = []

    // Check for images without alt text
    document.querySelectorAll('img:not([alt])').forEach(() => {
      issues.push('Image found without alt text')
    })

    // Check for buttons without accessible names
    document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
      if (!button.textContent?.trim()) {
        issues.push('Button found without accessible name')
      }
    })

    // Check for form inputs without labels
    document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
      const id = input.getAttribute('id')
      if (!id || !document.querySelector(`label[for="${id}"]`)) {
        issues.push('Form input found without proper label')
      }
    })

    // Check for insufficient color contrast (simplified check)
    const style = getComputedStyle(document.body)
    const bgColor = style.backgroundColor
    const textColor = style.color
    
    if (bgColor === textColor) {
      issues.push('Insufficient color contrast detected')
    }

    return issues
  }

  // Private helper methods

  private loadPreferences(): AccessibilityPreferences {
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
      console.error('Failed to load accessibility preferences:', error)
    }

    return {
      screenReaderEnabled: true,
      keyboardNavigationEnabled: true,
      skipLinksEnabled: true,
      enhancedFocus: false,
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      announcePageChanges: true,
      announceFormErrors: true,
      announceStatusUpdates: true,
      lastUpdated: new Date()
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.preferences))
    } catch (error) {
      console.error('Failed to save accessibility preferences:', error)
    }
  }

  private createAnnounceRegion(): void {
    this.announceRegion = document.createElement('div')
    this.announceRegion.id = 'accessibility-announcements'
    this.announceRegion.setAttribute('aria-live', 'polite')
    this.announceRegion.setAttribute('aria-atomic', 'true')
    this.announceRegion.style.position = 'absolute'
    this.announceRegion.style.left = '-10000px'
    this.announceRegion.style.width = '1px'
    this.announceRegion.style.height = '1px'
    this.announceRegion.style.overflow = 'hidden'
    
    document.body.appendChild(this.announceRegion)
  }

  private createSkipLinks(): void {
    if (!this.preferences.skipLinksEnabled) return

    this.skipLinksContainer = document.createElement('div')
    this.skipLinksContainer.className = 'skip-links'
    
    const skipToMain = this.createSkipLink('Skip to main content', () => this.skipToMain())
    const skipToNav = this.createSkipLink('Skip to navigation', () => this.skipToNavigation())
    
    this.skipLinksContainer.appendChild(skipToMain)
    this.skipLinksContainer.appendChild(skipToNav)
    
    document.body.insertBefore(this.skipLinksContainer, document.body.firstChild)
  }

  private createSkipLink(text: string, onClick: () => void): HTMLElement {
    const link = document.createElement('a')
    link.href = '#'
    link.textContent = text
    link.className = 'skip-link'
    link.onclick = (e) => {
      e.preventDefault()
      onClick()
    }
    return link
  }

  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardNavigation(event)
    })
  }

  private setupFocusManagement(): void {
    if (!this.preferences.enhancedFocus) return

    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement
      this.addFocusIndicator(target)
    })

    document.addEventListener('focusout', (event) => {
      const target = event.target as HTMLElement
      this.removeFocusIndicator(target)
    })
  }

  private addFocusIndicator(element: HTMLElement): void {
    element.classList.add('enhanced-focus')
  }

  private removeFocusIndicator(element: HTMLElement): void {
    element.classList.remove('enhanced-focus')
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[]
  }

  private cycleFocusSections(): void {
    const sections = ['header', 'nav', 'main', 'footer']
    const currentSection = this.getCurrentSection()
    const currentIndex = sections.indexOf(currentSection)
    const nextIndex = (currentIndex + 1) % sections.length
    
    this.focusElement(sections[nextIndex])
  }

  private getCurrentSection(): string {
    const focused = document.activeElement
    if (!focused) return 'main'

    if (focused.closest('header')) return 'header'
    if (focused.closest('nav')) return 'nav'
    if (focused.closest('footer')) return 'footer'
    return 'main'
  }

  private handleEscape(): void {
    // Close any open modals
    const modal = document.querySelector('.modal-overlay')
    if (modal) {
      (modal as HTMLElement).click()
      return
    }

    // Close any open dropdowns
    const dropdown = document.querySelector('.dropdown.open')
    if (dropdown) {
      dropdown.classList.remove('open')
      return
    }
  }

  private handleTabNavigation(event: KeyboardEvent): void {
    // Enhanced tab navigation with visual indicators
    setTimeout(() => {
      const focused = document.activeElement as HTMLElement
      if (focused) {
        this.announce(`Focused on ${this.getElementDescription(focused)}`, 'off')
      }
    }, 10)
  }

  private focusSearch(): void {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i], .search-input') as HTMLElement
    if (searchInput) {
      searchInput.focus()
      this.announce('Search field focused', 'polite')
    }
  }

  private getFieldLabel(field: HTMLElement): string {
    const id = field.getAttribute('id')
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`)
      if (label) return label.textContent?.trim() || 'Unknown field'
    }

    const ariaLabel = field.getAttribute('aria-label')
    if (ariaLabel) return ariaLabel

    const placeholder = field.getAttribute('placeholder')
    if (placeholder) return placeholder

    return 'Unknown field'
  }

  private getElementDescription(element: HTMLElement): string {
    const role = element.getAttribute('role')
    const ariaLabel = element.getAttribute('aria-label')
    const text = element.textContent?.trim()

    if (ariaLabel) return ariaLabel
    if (text && text.length < 50) return text
    if (role) return `${role} element`
    return element.tagName.toLowerCase()
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  }

  private applyPreferences(): void {
    document.documentElement.classList.toggle('enhanced-focus', this.preferences.enhancedFocus)
    document.documentElement.classList.toggle('keyboard-navigation', this.preferences.keyboardNavigationEnabled)
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => {
      try {
        callback(this.preferences)
      } catch (error) {
        console.error('Accessibility observer error:', error)
      }
    })
  }
}

export default new AccessibilityService()