import React from 'react'
import './CrisisButton.css'

interface CrisisButtonProps {
  onClick: () => void
}

/**
 * CrisisButton Component
 * 
 * Always-visible emergency support button per requirements
 * - Fixed position for immediate access
 * - High contrast for visibility
 * - Large touch target for accessibility
 * - Works offline with cached resources
 */
export default function CrisisButton({ onClick }: CrisisButtonProps): JSX.Element {
  return (
    <button
      className="crisis-button"
      onClick={onClick}
      title="Emergency Crisis Support - Click for immediate help"
      aria-label="Emergency Crisis Support"
      data-testid="crisis-button"
    >
      <span className="crisis-icon">🆘</span>
      <span className="crisis-text">Crisis</span>
    </button>
  )
}