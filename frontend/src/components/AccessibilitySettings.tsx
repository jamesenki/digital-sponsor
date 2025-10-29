import React, { useState } from 'react'
import { useAccessibility } from '@/hooks/useAccessibility'
import './AccessibilitySettings.css'

interface AccessibilitySettingsProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Accessibility Settings Component
 * 
 * Comprehensive accessibility configuration panel for the AA recovery app
 */
export default function AccessibilitySettings({ isOpen, onClose }: AccessibilitySettingsProps): JSX.Element {
  const {
    preferences,
    updatePreference,
    validateAccessibility,
    enhanceAriaLabels
  } = useAccessibility()

  const [validationResults, setValidationResults] = useState<string[]>([])
  const [showValidation, setShowValidation] = useState(false)

  if (!isOpen) return <></>

  const handleValidateAccessibility = () => {
    const issues = validateAccessibility()
    setValidationResults(issues)
    setShowValidation(true)
  }

  const handleEnhanceLabels = () => {
    enhanceAriaLabels()
    // Re-validate after enhancement
    handleValidateAccessibility()
  }

  const formatLastUpdated = (date: Date): string => {
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal accessibility-settings-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="accessibility-settings-title">
        <div className="modal-header">
          <h3 id="accessibility-settings-title">♿ Accessibility Settings</h3>
          <button 
            onClick={onClose} 
            className="close-button"
            aria-label="Close accessibility settings"
          >
            ✕
          </button>
        </div>
        
        <div className="modal-content">
          {/* Screen Reader Settings */}
          <div className="settings-section" role="group" aria-labelledby="screen-reader-heading">
            <h4 id="screen-reader-heading">📢 Screen Reader</h4>
            
            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.screenReaderEnabled}
                onChange={(e) => updatePreference('screenReaderEnabled', e.target.checked)}
                aria-describedby="screen-reader-desc"
              />
              <div className="option-content">
                <span className="option-title">Enable Screen Reader Support</span>
                <span className="option-description" id="screen-reader-desc">
                  Provides announcements and enhanced navigation for screen readers
                </span>
              </div>
            </label>

            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.announcePageChanges}
                onChange={(e) => updatePreference('announcePageChanges', e.target.checked)}
                disabled={!preferences.screenReaderEnabled}
                aria-describedby="page-changes-desc"
              />
              <div className="option-content">
                <span className="option-title">Announce Page Changes</span>
                <span className="option-description" id="page-changes-desc">
                  Announces when you navigate to different pages
                </span>
              </div>
            </label>

            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.announceFormErrors}
                onChange={(e) => updatePreference('announceFormErrors', e.target.checked)}
                disabled={!preferences.screenReaderEnabled}
                aria-describedby="form-errors-desc"
              />
              <div className="option-content">
                <span className="option-title">Announce Form Errors</span>
                <span className="option-description" id="form-errors-desc">
                  Announces form validation errors immediately
                </span>
              </div>
            </label>

            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.announceStatusUpdates}
                onChange={(e) => updatePreference('announceStatusUpdates', e.target.checked)}
                disabled={!preferences.screenReaderEnabled}
                aria-describedby="status-updates-desc"
              />
              <div className="option-content">
                <span className="option-title">Announce Status Updates</span>
                <span className="option-description" id="status-updates-desc">
                  Announces important status changes and notifications
                </span>
              </div>
            </label>
          </div>

          {/* Keyboard Navigation */}
          <div className="settings-section" role="group" aria-labelledby="keyboard-heading">
            <h4 id="keyboard-heading">⌨️ Keyboard Navigation</h4>
            
            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.keyboardNavigationEnabled}
                onChange={(e) => updatePreference('keyboardNavigationEnabled', e.target.checked)}
                aria-describedby="keyboard-nav-desc"
              />
              <div className="option-content">
                <span className="option-title">Enhanced Keyboard Navigation</span>
                <span className="option-description" id="keyboard-nav-desc">
                  Enables advanced keyboard shortcuts and navigation features
                </span>
              </div>
            </label>

            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.skipLinksEnabled}
                onChange={(e) => updatePreference('skipLinksEnabled', e.target.checked)}
                aria-describedby="skip-links-desc"
              />
              <div className="option-content">
                <span className="option-title">Skip Navigation Links</span>
                <span className="option-description" id="skip-links-desc">
                  Shows skip links to jump to main content and navigation
                </span>
              </div>
            </label>

            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.enhancedFocus}
                onChange={(e) => updatePreference('enhancedFocus', e.target.checked)}
                aria-describedby="enhanced-focus-desc"
              />
              <div className="option-content">
                <span className="option-title">Enhanced Focus Indicators</span>
                <span className="option-description" id="enhanced-focus-desc">
                  Provides stronger visual focus indicators for better visibility
                </span>
              </div>
            </label>
          </div>

          {/* Motion and Visual */}
          <div className="settings-section" role="group" aria-labelledby="motion-heading">
            <h4 id="motion-heading">🎭 Motion and Visual</h4>
            
            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.reduceMotion}
                onChange={(e) => updatePreference('reduceMotion', e.target.checked)}
                aria-describedby="reduce-motion-desc"
              />
              <div className="option-content">
                <span className="option-title">Reduce Motion</span>
                <span className="option-description" id="reduce-motion-desc">
                  Minimizes animations and transitions to reduce motion sensitivity
                </span>
              </div>
            </label>

            <label className="accessibility-option">
              <input
                type="checkbox"
                checked={preferences.highContrast}
                onChange={(e) => updatePreference('highContrast', e.target.checked)}
                aria-describedby="high-contrast-desc"
              />
              <div className="option-content">
                <span className="option-title">High Contrast Mode</span>
                <span className="option-description" id="high-contrast-desc">
                  Increases color contrast for better visibility
                </span>
              </div>
            </label>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="settings-section">
            <h4>⚡ Keyboard Shortcuts</h4>
            <div className="keyboard-shortcuts">
              <div className="shortcut-item">
                <span className="shortcut-keys">F6</span>
                <span className="shortcut-description">Navigate between page sections</span>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-keys">Escape</span>
                <span className="shortcut-description">Close modals and dropdowns</span>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-keys">Ctrl + /</span>
                <span className="shortcut-description">Focus search field</span>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-keys">Tab</span>
                <span className="shortcut-description">Navigate forward through elements</span>
              </div>
              <div className="shortcut-item">
                <span className="shortcut-keys">Shift + Tab</span>
                <span className="shortcut-description">Navigate backward through elements</span>
              </div>
            </div>
          </div>

          {/* Accessibility Tools */}
          <div className="settings-section">
            <h4>🔧 Accessibility Tools</h4>
            
            <div className="tool-actions">
              <button 
                onClick={handleEnhanceLabels}
                className="tool-button"
                aria-describedby="enhance-labels-desc"
              >
                ✨ Enhance ARIA Labels
              </button>
              <p className="tool-description" id="enhance-labels-desc">
                Automatically improves accessibility labels for better screen reader support
              </p>

              <button 
                onClick={handleValidateAccessibility}
                className="tool-button"
                aria-describedby="validate-desc"
              >
                🔍 Validate Accessibility
              </button>
              <p className="tool-description" id="validate-desc">
                Checks the current page for common accessibility issues
              </p>
            </div>

            {showValidation && (
              <div className="validation-results" role="region" aria-labelledby="validation-title">
                <h5 id="validation-title">Validation Results</h5>
                {validationResults.length === 0 ? (
                  <div className="success-message">
                    ✅ No accessibility issues found!
                  </div>
                ) : (
                  <div className="error-message">
                    <div>
                      <strong>Found {validationResults.length} issue(s):</strong>
                      <ul>
                        {validationResults.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings Info */}
          <div className="settings-info">
            <h5>ℹ️ Information</h5>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Last Updated:</span>
                <span className="info-value">{formatLastUpdated(preferences.lastUpdated)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">System Reduced Motion:</span>
                <span className="info-value">
                  {window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">System High Contrast:</span>
                <span className="info-value">
                  {window.matchMedia('(prefers-contrast: high)').matches ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="privacy-notice">
            <h5>🔒 Privacy</h5>
            <p>
              All accessibility preferences are stored locally on your device in compliance with AA Tradition 12. 
              No accessibility data is transmitted to external servers.
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