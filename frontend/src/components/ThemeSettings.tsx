import React, { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import type { ThemeMode } from '@/services/themeService'
import './ThemeSettings.css'

interface ThemeSettingsProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Theme Settings Component
 * 
 * Comprehensive theme and accessibility settings panel
 */
export default function ThemeSettings({ isOpen, onClose }: ThemeSettingsProps): JSX.Element {
  const {
    currentMode,
    currentTheme,
    preferences,
    setTheme,
    toggleTheme,
    setReduceMotion,
    setHighContrast,
    setFontSize
  } = useTheme()

  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!isOpen) return <></>

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode)
  }

  const getThemeIcon = (mode: ThemeMode): string => {
    switch (mode) {
      case 'light': return '☀️'
      case 'dark': return '🌙'
      case 'auto': return '🔄'
      default: return '🎨'
    }
  }

  const getFontSizeLabel = (size: string): string => {
    switch (size) {
      case 'small': return 'Small (Compact)'
      case 'medium': return 'Medium (Default)'
      case 'large': return 'Large (Comfortable)'
      default: return 'Medium'
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal theme-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎨 Theme & Accessibility Settings</h3>
          <button onClick={onClose} className="close-button">✕</button>
        </div>
        
        <div className="modal-content">
          {/* Current Theme Display */}
          <div className="current-theme-display">
            <div className="theme-preview">
              <span className="theme-icon">{getThemeIcon(currentMode)}</span>
              <div className="theme-info">
                <h4>Current Theme: {currentTheme === 'light' ? 'Light' : 'Dark'}</h4>
                <p>Mode: {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}</p>
              </div>
            </div>
            <button onClick={toggleTheme} className="quick-toggle-button">
              🔄 Quick Toggle
            </button>
          </div>

          {/* Theme Mode Selection */}
          <div className="settings-section">
            <h4>🌓 Theme Mode</h4>
            <div className="theme-options">
              {(['light', 'dark', 'auto'] as ThemeMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleThemeChange(mode)}
                  className={`theme-option ${currentMode === mode ? 'selected' : ''}`}
                >
                  <span className="option-icon">{getThemeIcon(mode)}</span>
                  <div className="option-content">
                    <span className="option-title">
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </span>
                    <span className="option-description">
                      {mode === 'light' && 'Always use light theme'}
                      {mode === 'dark' && 'Always use dark theme'}
                      {mode === 'auto' && 'Follow system preference'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="settings-section">
            <h4>📝 Font Size</h4>
            <div className="font-size-options">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`font-option ${preferences.fontSize === size ? 'selected' : ''}`}
                >
                  <span className="font-preview" style={{ fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px' }}>
                    Aa
                  </span>
                  <span className="font-label">{getFontSizeLabel(size)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accessibility Options */}
          <div className="settings-section">
            <h4>♿ Accessibility</h4>
            
            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
              />
              <div className="option-content">
                <span className="option-title">🏃‍♂️ Reduce Motion</span>
                <span className="option-description">
                  Minimize animations and transitions for better accessibility
                </span>
              </div>
            </label>

            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
              />
              <div className="option-content">
                <span className="option-title">🔍 High Contrast</span>
                <span className="option-description">
                  Increase color contrast for better visibility
                </span>
              </div>
            </label>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="settings-section">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="advanced-toggle"
            >
              <span>{showAdvanced ? '▼' : '▶'} Advanced Settings</span>
            </button>
            
            {showAdvanced && (
              <div className="advanced-settings">
                <div className="setting-info">
                  <h5>🔧 Technical Information</h5>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">System Dark Mode:</span>
                      <span className="info-value">
                        {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">System Reduced Motion:</span>
                      <span className="info-value">
                        {window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Last Updated:</span>
                      <span className="info-value">
                        {preferences.lastUpdated.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="reset-section">
                  <h5>🔄 Reset Settings</h5>
                  <button 
                    onClick={() => {
                      setTheme('auto')
                      setFontSize('medium')
                      setReduceMotion(false)
                      setHighContrast(false)
                    }}
                    className="reset-button"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="privacy-notice">
            <h5>🔒 Privacy</h5>
            <p>
              All theme preferences are stored locally on your device. 
              No theme or accessibility data is transmitted to external servers.
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="primary-button">
            ✅ Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}