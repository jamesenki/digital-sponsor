import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

// Mock components to avoid complex dependencies in unit tests
vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    session: { id: 'test-session', createdAt: new Date() },
    createSession: vi.fn().mockResolvedValue({ id: 'test-session', createdAt: new Date() }),
    clearSession: vi.fn(),
  }),
}))

vi.mock('../hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}))

describe('App Component', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('digital-sponsor-app')).toBeInTheDocument()
  })

  it('displays the app title', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    
    expect(screen.getByText('🤝 Digital Sponsor')).toBeInTheDocument()
  })

  it('shows AA Traditions compliance indicators', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    
    expect(screen.getByText('✅ AA Traditions Compliant')).toBeInTheDocument()
    expect(screen.getByText('🔒 Privacy-First')).toBeInTheDocument()
    expect(screen.getByText('🤝 Community Service')).toBeInTheDocument()
  })

  it('includes crisis support button', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    
    expect(screen.getByText('Crisis')).toBeInTheDocument()
  })

  it('displays privacy and anonymity indicators', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    
    expect(screen.getByText('🔒 Anonymous')).toBeInTheDocument()
  })
})