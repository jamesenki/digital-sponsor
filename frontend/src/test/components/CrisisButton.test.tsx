import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CrisisButton from '../../components/CrisisButton'

describe('CrisisButton Component', () => {
  it('renders the crisis button', () => {
    const mockOnClick = vi.fn()
    render(<CrisisButton onClick={mockOnClick} />)
    
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('Crisis')).toBeInTheDocument()
    expect(screen.getByText('🆘')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    const mockOnClick = vi.fn()
    render(<CrisisButton onClick={mockOnClick} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Emergency Crisis Support')
  })

  it('calls onClick when clicked', () => {
    const mockOnClick = vi.fn()
    render(<CrisisButton onClick={mockOnClick} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('has crisis button styling class', () => {
    const mockOnClick = vi.fn()
    render(<CrisisButton onClick={mockOnClick} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('crisis-button')
  })
})