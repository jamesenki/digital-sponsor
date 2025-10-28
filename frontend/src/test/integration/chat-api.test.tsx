import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ChatPage from '../../components/ChatPage'

/**
 * Integration Tests for Chat API Communication
 * 
 * These tests verify the complete flow between frontend and backend
 * without mocking the API calls (uses real HTTP requests to test server)
 */

// Mock the session hook to provide a stable session ID
vi.mock('../../hooks/useSession', () => ({
  useSession: () => ({
    session: { id: 'integration-test-session', createdAt: new Date() },
    createSession: vi.fn().mockResolvedValue({ id: 'integration-test-session', createdAt: new Date() }),
    clearSession: vi.fn(),
  }),
}))

describe('Chat API Integration Tests', () => {
  const user = userEvent.setup()
  
  // Test server should be running on localhost:3001
  const API_BASE_URL = 'http://localhost:3001'
  
  beforeAll(async () => {
    // Verify test server is running
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`)
      if (!response.ok) {
        throw new Error(`Test server not available: ${response.status}`)
      }
      const health = await response.json()
      console.log('✅ Test server is running:', health.service)
    } catch (error) {
      console.warn('⚠️ Test server not available, skipping integration tests')
      // You could also throw here to fail the tests if server is required
    }
  })

  const renderChatPage = () => {
    return render(
      <MemoryRouter>
        <ChatPage 
          isOnline={true}
          session={{ 
            id: 'integration-test-session', 
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isAnonymous: true as const
          }}
        />
      </MemoryRouter>
    )
  }

  it('performs complete chat flow with literature-based response', async () => {
    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    // Send a question that should trigger literature search
    await user.type(input, 'What about community support?')
    await user.click(sendButton)
    
    // Wait for response (may take a few seconds for real API)
    await waitFor(
      () => {
        // Should get a literature-based response
        expect(screen.getByText(/community support/i)).toBeInTheDocument()
      },
      { timeout: 10000 } // Allow up to 10 seconds for API response
    )
    
    // Verify response includes proper attribution
    await waitFor(() => {
      expect(screen.getByText(/copyright/i)).toBeInTheDocument()
    })
  }, 15000) // Increase test timeout for real API calls

  it('handles crisis detection correctly', async () => {
    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    // Send a crisis-related message
    await user.type(input, 'I want to hurt myself')
    await user.click(sendButton)
    
    // Wait for crisis response
    await waitFor(
      () => {
        expect(screen.getByText(/crisis resources/i)).toBeInTheDocument()
        expect(screen.getByText('988')).toBeInTheDocument()
      },
      { timeout: 10000 }
    )
  }, 15000)

  it('shows appropriate response for non-matching queries', async () => {
    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    // Send a question unlikely to match literature
    await user.type(input, 'What is the weather like today?')
    await user.click(sendButton)
    
    // Should get a general guidance response
    await waitFor(
      () => {
        expect(screen.getByText(/didn't find specific content/i)).toBeInTheDocument()
        expect(screen.getByText(/local aa group/i)).toBeInTheDocument()
      },
      { timeout: 10000 }
    )
  }, 15000)

  it('maintains session consistency across requests', async () => {
    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    // Send first message
    await user.type(input, 'First question about recovery')
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByText(/first question about recovery/i)).toBeInTheDocument()
    }, { timeout: 10000 })
    
    // Send second message
    await user.type(input, 'Second question about steps')
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByText(/second question about steps/i)).toBeInTheDocument()
    }, { timeout: 10000 })
    
    // Both messages should be in chat history
    expect(screen.getByText(/first question about recovery/i)).toBeInTheDocument()
    expect(screen.getByText(/second question about steps/i)).toBeInTheDocument()
  }, 20000)

  it('validates API error handling', async () => {
    // Temporarily override fetch to simulate network error
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    
    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Test question')
    await user.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByText(/unable to process/i)).toBeInTheDocument()
    })
    
    // Restore original fetch
    global.fetch = originalFetch
  })

  it('verifies response time performance', async () => {
    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    const startTime = Date.now()
    
    await user.type(input, 'What about recovery?')
    await user.click(sendButton)
    
    await waitFor(
      () => {
        const responseTime = Date.now() - startTime
        // Response should come within reasonable time (5 seconds)
        expect(responseTime).toBeLessThan(5000)
        
        // Should have received a response
        expect(screen.getByText(/recovery/i)).toBeInTheDocument()
      },
      { timeout: 10000 }
    )
  }, 15000)

  it('verifies AA Traditions compliance in responses', async () => {
    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Tell me about AA traditions')
    await user.click(sendButton)
    
    await waitFor(
      () => {
        // Should show anonymous session indicator
        expect(screen.getByText(/anonymous/i)).toBeInTheDocument()
        
        // Should include proper compliance indicators
        expect(screen.getByText(/aa traditions/i)).toBeInTheDocument()
      },
      { timeout: 10000 }
    )
  }, 15000)
})

/**
 * Literature Search API Integration Tests
 */
describe('Literature Search API Integration Tests', () => {
  const user = userEvent.setup()
  
  it('performs complete literature search flow', async () => {
    const { container } = render(
      <MemoryRouter>
        <div data-testid="literature-search-test">
          {/* We'll test the API directly since LiteraturePage may not be imported here */}
        </div>
      </MemoryRouter>
    )
    
    // Test the search API directly
    const response = await fetch('http://localhost:3001/api/literature/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'recovery community',
        limit: 5
      })
    })
    
    expect(response.ok).toBe(true)
    
    const data = await response.json()
    expect(data.query).toBe('recovery community')
    expect(data.compliance.aa_traditions).toBe(true)
    expect(data.compliance.anonymous_access).toBe(true)
    expect(Array.isArray(data.results)).toBe(true)
  })

  it('verifies literature sources API', async () => {
    const response = await fetch('http://localhost:3001/api/literature/sources')
    
    expect(response.ok).toBe(true)
    
    const data = await response.json()
    expect(typeof data.totalSources).toBe('number')
    expect(Array.isArray(data.sources)).toBe(true)
    expect(data.compliance.aa_approved_only).toBe(true)
    
    // Should have our test literature sources
    expect(data.totalSources).toBeGreaterThan(0)
  })

  it('tests advanced search functionality', async () => {
    const response = await fetch('http://localhost:3001/api/literature/advanced-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'recovery',
        categories: ['big_book'],
        limit: 3
      })
    })
    
    expect(response.ok).toBe(true)
    
    const data = await response.json()
    expect(data.query).toBe('recovery')
    expect(data.filters.categories).toEqual(['big_book'])
    expect(Array.isArray(data.results)).toBe(true)
  })
})

/**
 * Service Health Integration Tests
 */
describe('Service Health Integration Tests', () => {
  it('verifies chat service is operational', async () => {
    const response = await fetch('http://localhost:3001/api/chat/status')
    
    expect(response.ok).toBe(true)
    
    const data = await response.json()
    expect(data.service).toBe('Digital Sponsor Chat')
    expect(data.status).toBe('operational')
    expect(data.capabilities.literature_search).toBe(true)
    expect(data.capabilities.crisis_detection).toBe(true)
    expect(data.compliance.aa_traditions).toBe('All 12 traditions observed')
  })

  it('verifies chat suggestions endpoint', async () => {
    const response = await fetch('http://localhost:3001/api/chat/suggestions')
    
    expect(response.ok).toBe(true)
    
    const data = await response.json()
    expect(Array.isArray(data.suggestions)).toBe(true)
    expect(data.suggestions.length).toBeGreaterThan(0)
    expect(data.compliance.aa_traditions).toBe(true)
    
    // Should have suggestions with proper structure
    const firstSuggestion = data.suggestions[0]
    expect(firstSuggestion.category).toBeDefined()
    expect(Array.isArray(firstSuggestion.examples)).toBe(true)
  })

  it('verifies overall system health', async () => {
    const response = await fetch('http://localhost:3001/api/health')
    
    expect(response.ok).toBe(true)
    
    const data = await response.json()
    expect(data.service).toBe('Digital Sponsor API')
    expect(data.compliance).toBe('AA Traditions 1-12')
    expect(data.anonymous).toBe(true)
  })
})