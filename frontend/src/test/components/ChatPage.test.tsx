import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ChatPage from '../../components/ChatPage'

// Mock the session hook
const mockCreateSession = vi.fn()
const mockSession = { 
  id: 'test-session-123', 
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  isAnonymous: true as const
}

vi.mock('../../hooks/useSession', () => ({
  useSession: () => ({
    session: mockSession,
    createSession: mockCreateSession,
    clearSession: vi.fn(),
  }),
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('ChatPage Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as Mock).mockClear()
  })

  const renderChatPage = () => {
    return render(
      <MemoryRouter>
        <ChatPage 
          isOnline={true}
          session={mockSession}
        />
      </MemoryRouter>
    )
  }

  it('renders chat interface correctly', () => {
    renderChatPage()
    
    expect(screen.getByText('💬 Chat with Your Digital Sponsor')).toBeInTheDocument()
    expect(screen.getByText('Ask questions about AA literature, the steps, or recovery topics.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/ask about aa literature/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('displays AA Traditions compliance notice', () => {
    renderChatPage()
    
    expect(screen.getByText(/anonymous and confidential/i)).toBeInTheDocument()
    expect(screen.getByText(/aa traditions compliant/i)).toBeInTheDocument()
  })

  it('shows crisis support button', () => {
    renderChatPage()
    
    expect(screen.getByText('Crisis')).toBeInTheDocument()
  })

  it('displays suggested questions', () => {
    renderChatPage()
    
    expect(screen.getByText('Suggested Questions:')).toBeInTheDocument()
    expect(screen.getByText('What does the Big Book say about Step 1?')).toBeInTheDocument()
    expect(screen.getByText('How do I work with resentments?')).toBeInTheDocument()
    expect(screen.getByText('What are the promises of recovery?')).toBeInTheDocument()
  })

  it('handles message input correctly', async () => {
    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    
    await user.type(input, 'What is Step 1 about?')
    expect(input).toHaveValue('What is Step 1 about?')
  })

  it('disables send button when input is empty', () => {
    renderChatPage()
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when input has text', async () => {
    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Test question')
    expect(sendButton).toBeEnabled()
  })

  it('sends chat message successfully', async () => {
    const mockResponse = {
      response: {
        message: 'This is a test response from the RAG system.',
        type: 'literature_based',
        confidence: 0.85,
        sources: [
          {
            title: 'Alcoholics Anonymous (Big Book) - Chapter 1',
            page: 58,
            excerpt: 'We admitted we were powerless...',
            copyright: 'Copyright © AA World Services, Inc.'
          }
        ],
        processing_time_ms: 250
      },
      session: {
        id: 'test-session-123',
        anonymous: true,
        timestamp: new Date().toISOString()
      },
      compliance: {
        aa_traditions: true,
        fair_use: true,
        educational_purpose: true,
        attribution_included: true,
        literature_based: true
      }
    }

    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    const sendButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'What is Step 1?')
    await user.click(sendButton)
    
    // Verify API call
    expect(fetch).toHaveBeenCalledWith('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What is Step 1?',
        sessionId: 'test-session-123'
      })
    })

    // Wait for response to appear
    await waitFor(() => {
      expect(screen.getByText('This is a test response from the RAG system.')).toBeInTheDocument()
    })

    // Check that input was cleared
    expect(input).toHaveValue('')
  })

  it('displays message sources and citations', async () => {
    const mockResponse = {
      response: {
        message: 'Test response',
        type: 'literature_based',
        confidence: 0.9,
        sources: [
          {
            title: 'Big Book - Chapter 5',
            page: 58,
            excerpt: 'Rarely have we seen a person fail...',
            copyright: 'Copyright © AA World Services, Inc.'
          }
        ]
      },
      compliance: {
        aa_traditions: true,
        fair_use: true,
        attribution_included: true
      }
    }

    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    await user.type(input, 'Test question')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Sources:')).toBeInTheDocument()
      expect(screen.getByText('Big Book - Chapter 5 (p. 58)')).toBeInTheDocument()
      expect(screen.getByText('Copyright © AA World Services, Inc.')).toBeInTheDocument()
    })
  })

  it('handles crisis response appropriately', async () => {
    const mockCrisisResponse = {
      response: {
        message: 'I understand you\'re going through a difficult time. Please reach out for immediate help.',
        type: 'crisis_referral',
        confidence: 1.0,
        sources: []
      },
      crisis_support: {
        immediate_help: {
          suicide_lifeline: '988',
          crisis_text: 'Text HOME to 741741',
          emergency: '911'
        },
        aa_resources: {
          meeting_guide: 'https://meetingguide.aa.org',
          general_service: '(212) 870-3400'
        }
      }
    }

    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      status: 202, // Crisis response status
      json: () => Promise.resolve(mockCrisisResponse)
    })

    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    await user.type(input, 'I want to hurt myself')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/please reach out for immediate help/i)).toBeInTheDocument()
      expect(screen.getByText('Crisis Resources:')).toBeInTheDocument()
      expect(screen.getByText('988')).toBeInTheDocument()
      expect(screen.getByText('Text HOME to 741741')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    ;(fetch as Mock).mockRejectedValueOnce(new Error('Network error'))

    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    await user.type(input, 'Test question')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/unable to process your question/i)).toBeInTheDocument()
      expect(screen.getByText(/please try again/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during API call', async () => {
    ;(fetch as Mock).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ response: { message: 'Response' } })
      }), 100))
    )

    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    await user.type(input, 'Test question')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    // Should show loading state
    expect(screen.getByText(/thinking/i)).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument()
    })
  })

  it('handles suggested question clicks', async () => {
    const mockResponse = {
      response: {
        message: 'Step 1 response',
        type: 'literature_based',
        sources: []
      }
    }

    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    renderChatPage()
    
    const suggestionButton = screen.getByText('What does the Big Book say about Step 1?')
    await user.click(suggestionButton)
    
    expect(fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      body: JSON.stringify({
        message: 'What does the Big Book say about Step 1?',
        sessionId: 'test-session-123'
      })
    }))
  })

  it('validates message length', async () => {
    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    const longMessage = 'a'.repeat(501) // Over 500 character limit
    
    await user.type(input, longMessage)
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/message too long/i)).toBeInTheDocument()
    })
  })

  it('maintains chat history', async () => {
    const firstResponse = {
      response: { message: 'First response', type: 'literature_based', sources: [] }
    }
    const secondResponse = {
      response: { message: 'Second response', type: 'literature_based', sources: [] }
    }

    ;(fetch as Mock)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(firstResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(secondResponse) })

    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    
    // Send first message
    await user.type(input, 'First question')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(screen.getByText('First response')).toBeInTheDocument()
    })
    
    // Send second message
    await user.type(input, 'Second question')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Second response')).toBeInTheDocument()
    })
    
    // Both messages should still be visible
    expect(screen.getByText('First response')).toBeInTheDocument()
    expect(screen.getByText('Second response')).toBeInTheDocument()
  })

  it('displays confidence scores for responses', async () => {
    const mockResponse = {
      response: {
        message: 'High confidence response',
        type: 'literature_based',
        confidence: 0.92,
        sources: []
      }
    }

    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    renderChatPage()
    
    const input = screen.getByPlaceholderText(/ask about aa literature/i)
    await user.type(input, 'Test question')
    await user.click(screen.getByRole('button', { name: /send/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/confidence: 92%/i)).toBeInTheDocument()
    })
  })
})