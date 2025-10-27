import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoadingSpinner from '../../components/LoadingSpinner'

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom text', () => {
    render(<LoadingSpinner text="Initializing..." />)
    
    expect(screen.getByText('Initializing...')).toBeInTheDocument()
  })

  it('applies correct size classes', () => {
    const { rerender } = render(<LoadingSpinner size="small" />)
    expect(screen.getByTestId('loading-spinner')).toHaveClass('loading-spinner--small')
    
    rerender(<LoadingSpinner size="medium" />)
    expect(screen.getByTestId('loading-spinner')).toHaveClass('loading-spinner--medium')
    
    rerender(<LoadingSpinner size="large" />)
    expect(screen.getByTestId('loading-spinner')).toHaveClass('loading-spinner--large')
  })

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner text="Processing..." />)
    
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toHaveAttribute('role', 'status')
    expect(spinner).toHaveAttribute('aria-label', 'Processing...')
  })

  it('includes screen reader text', () => {
    render(<LoadingSpinner text="Loading data..." />)
    
    // Check for sr-only class (screen reader only)
    const srText = document.querySelector('.sr-only')
    expect(srText).toBeInTheDocument()
    expect(srText).toHaveTextContent('Loading data...')
  })
})