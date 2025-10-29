import React, { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import ThemeSettings from './ThemeSettings'
import AccessibilitySettings from './AccessibilitySettings'
import SyncSettings from './SyncSettings'
import './ThemeToggle.css'

interface ThemeToggleProps {
  showLabel?: boolean
  size?: 'small' | 'medium' | 'large'
  className?: string
}

/**
 * Theme Toggle Component
 * 
 * Quick theme toggle button with optional settings access
 */
export default function ThemeToggle({ 
  showLabel = false, 
  size = 'medium',
  className = '' 
}: ThemeToggleProps): JSX.Element {
  const { currentMode, currentTheme, toggleTheme } = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false)
  const [showSyncSettings, setShowSyncSettings] = useState(false)

  const getThemeIcon = (): string => {
    switch (currentTheme) {
      case 'light': return '☀️'
      case 'dark': return '🌙'
      default: return '🎨'
    }
  }

  const getThemeLabel = (): string => {
    if (currentMode === 'auto') {
      return `Auto (${currentTheme === 'light' ? 'Light' : 'Dark'})`
    }
    return currentTheme === 'light' ? 'Light' : 'Dark'
  }

  const handleQuickToggle = () => {
    toggleTheme()
  }

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowSettings(true)
  }

  const handleAccessibilityClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowAccessibilitySettings(true)
  }

  const handleSyncClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowSyncSettings(true)
  }

  return (
    <>
      <div className={`theme-toggle ${size} ${className}`}>
        <button 
          onClick={handleQuickToggle}
          className="theme-toggle-button"
          title={`Current theme: ${getThemeLabel()}. Click to toggle.`}
          aria-label={`Toggle theme. Current: ${getThemeLabel()}`}
        >
          <span className="theme-icon">{getThemeIcon()}</span>
          {showLabel && (
            <span className="theme-label">
              {currentTheme === 'light' ? 'Light' : 'Dark'}
            </span>
          )}
        </button>
        
        <button
          onClick={handleSettingsClick}
          className="theme-settings-button"
          title="Open theme settings"
          aria-label="Open theme settings"
        >
          ⚙️
        </button>

        <button
          onClick={handleAccessibilityClick}
          className="accessibility-settings-button"
          title="Open accessibility settings"
          aria-label="Open accessibility settings"
        >
          ♿
        </button>

        <button
          onClick={handleSyncClick}
          className="sync-settings-button"
          title="Open sync and backup settings"
          aria-label="Open sync and backup settings"
        >
          ☁️
        </button>
      </div>

      <ThemeSettings 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <AccessibilitySettings 
        isOpen={showAccessibilitySettings}
        onClose={() => setShowAccessibilitySettings(false)}
      />

      <SyncSettings 
        isOpen={showSyncSettings}
        onClose={() => setShowSyncSettings(false)}
      />
    </>
  )
}