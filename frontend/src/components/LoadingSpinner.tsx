import React from 'react'
import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
}

/**
 * LoadingSpinner Component
 * 
 * Accessible loading indicator with support for:
 * - Multiple sizes
 * - Screen readers
 * - Reduced motion preferences
 */
export default function LoadingSpinner({ 
  size = 'medium', 
  text = 'Loading...' 
}: LoadingSpinnerProps): JSX.Element {
  return (
    <div 
      className={`loading-spinner loading-spinner--${size}`}
      role="status"
      aria-label={text}
      data-testid="loading-spinner"
    >
      <div className="spinner-circle" />
      <span className="spinner-text">{text}</span>
      <span className="sr-only">{text}</span>
    </div>
  )
}