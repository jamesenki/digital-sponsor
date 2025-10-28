import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LiteraturePage from '../../components/LiteraturePage'

// Mock fetch for API calls
global.fetch = vi.fn()

describe('LiteraturePage Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as Mock).mockClear()
  })

  const renderLiteraturePage = () => {
    return render(
      <MemoryRouter>
        <LiteraturePage 
          isOnline={true}
          session={{ 
            id: 'test-session', 
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isAnonymous: true as const
          }}
        />
      </MemoryRouter>
    )
  }

  const mockLiteratureSources = {
    totalSources: 3,
    sources: [
      {
        id: '1',
        title: 'Alcoholics Anonymous (Big Book)',
        category: 'big_book',
        author: 'Bill W. and AA Members',
        publishedDate: '2001-01-01',
        copyright: 'Copyright © AA World Services, Inc.',
        contentChunks: 15,
        available: true
      },
      {
        id: '2',
        title: 'Twelve Steps and Twelve Traditions',
        category: 'twelve_and_twelve',
        author: 'Bill W.',
        publishedDate: '1953-04-01',
        copyright: 'Copyright © AA World Services, Inc.',
        contentChunks: 8,
        available: true
      },
      {
        id: '3',
        title: 'Daily Reflections',
        category: 'daily_reflections',
        author: 'AA World Services',
        publishedDate: '1990-01-01',
        copyright: 'Copyright © AA World Services, Inc.',
        contentChunks: 0,
        available: false
      }
    ],
    compliance: {
      aa_approved_only: true,
      fair_use_attribution: true,
      anonymous_access: true
    }
  }

  const mockSearchResults = {
    query: 'recovery',
    totalResults: 2,
    results: [
      {
        id: '1',
        sourceTitle: 'Alcoholics Anonymous (Big Book)',
        sectionTitle: 'Chapter 1',
        content: 'Recovery is a journey that begins with a single step...',
        pageNumber: 1,
        chapterNumber: 1,
        relevanceScore: 0.85,
        copyright: 'Copyright © AA World Services, Inc.'
      },
      {
        id: '2',
        sourceTitle: 'Twelve Steps and Twelve Traditions',
        sectionTitle: 'Step 1',
        content: 'We admitted we were powerless over our addiction...',
        pageNumber: 21,
        chapterNumber: 1,
        relevanceScore: 0.78,
        copyright: 'Copyright © AA World Services, Inc.'
      }
    ],
    compliance: {
      aa_traditions: true,
      anonymous_access: true,
      fair_use: true,
      attribution_required: true
    }
  }

  it('renders literature page correctly', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    renderLiteraturePage()
    
    expect(screen.getByText('📚 AA Literature Search')).toBeInTheDocument()
    expect(screen.getByText('Search through AA-approved literature for guidance and wisdom.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search aa literature/i)).toBeInTheDocument()
  })

  it('loads and displays literature sources on mount', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    renderLiteraturePage()
    
    await waitFor(() => {
      expect(screen.getByText('Available Literature Sources:')).toBeInTheDocument()
      expect(screen.getByText('Alcoholics Anonymous (Big Book)')).toBeInTheDocument()
      expect(screen.getByText('Twelve Steps and Twelve Traditions')).toBeInTheDocument()
      expect(screen.getByText('Daily Reflections')).toBeInTheDocument()
    })

    // Check that fetch was called for sources
    expect(fetch).toHaveBeenCalledWith('/api/literature/sources')
  })

  it('shows availability status for sources', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    renderLiteraturePage()
    
    await waitFor(() => {
      // Available sources should show content count
      expect(screen.getByText('15 chapters available')).toBeInTheDocument()
      expect(screen.getByText('8 chapters available')).toBeInTheDocument()
      
      // Unavailable sources should show status
      expect(screen.getByText('Not yet available')).toBeInTheDocument()
    })
  })

  it('performs literature search correctly', async () => {
    // Mock sources load
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    // Mock search results
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResults)
    })

    renderLiteraturePage()
    
    // Wait for sources to load
    await waitFor(() => {
      expect(screen.getByText('Available Literature Sources:')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText(/search aa literature/i)
    const searchButton = screen.getByRole('button', { name: /search/i })
    
    await user.type(searchInput, 'recovery')
    await user.click(searchButton)
    
    // Verify search API call
    expect(fetch).toHaveBeenCalledWith('/api/literature/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'recovery',
        limit: 10
      })
    })

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Search Results (2 found):')).toBeInTheDocument()
      expect(screen.getByText('Recovery is a journey that begins with a single step...')).toBeInTheDocument()
      expect(screen.getByText('We admitted we were powerless over our addiction...')).toBeInTheDocument()
    })
  })

  it('displays search result metadata correctly', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResults)
    })

    renderLiteraturePage()
    
    await waitFor(() => {
      expect(screen.getByText('Available Literature Sources:')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText(/search aa literature/i)
    await user.type(searchInput, 'recovery')
    await user.click(screen.getByRole('button', { name: /search/i }))
    
    await waitFor(() => {
      // Check source titles and page numbers
      expect(screen.getByText('Alcoholics Anonymous (Big Book) - Chapter 1')).toBeInTheDocument()
      expect(screen.getByText('Page 1')).toBeInTheDocument()
      expect(screen.getByText('Twelve Steps and Twelve Traditions - Step 1')).toBeInTheDocument()
      expect(screen.getByText('Page 21')).toBeInTheDocument()
      
      // Check relevance scores
      expect(screen.getByText('85% relevance')).toBeInTheDocument()
      expect(screen.getByText('78% relevance')).toBeInTheDocument()
      
      // Check copyright notices
      expect(screen.getAllByText('Copyright © AA World Services, Inc.')).toHaveLength(2)
    })
  })

  it('handles empty search results', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    const emptyResults = {
      query: 'nonexistent',
      totalResults: 0,
      results: [],
      compliance: mockSearchResults.compliance
    }

    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(emptyResults)
    })

    renderLiteraturePage()
    
    await waitFor(() => {
      expect(screen.getByText('Available Literature Sources:')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText(/search aa literature/i)
    await user.type(searchInput, 'nonexistent')
    await user.click(screen.getByRole('button', { name: /search/i }))
    
    await waitFor(() => {
      expect(screen.getByText('No results found for "nonexistent"')).toBeInTheDocument()
      expect(screen.getByText('Try different keywords or browse the available sources above.')).toBeInTheDocument()
    })
  })

  it('allows filtering by source category', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSearchResults)
    })

    renderLiteraturePage()
    
    await waitFor(() => {
      expect(screen.getByText('Available Literature Sources:')).toBeInTheDocument()
    })
    
    // Select category filter
    const categorySelect = screen.getByDisplayValue('All Sources')
    await user.selectOptions(categorySelect, 'big_book')
    
    const searchInput = screen.getByPlaceholderText(/search aa literature/i)
    await user.type(searchInput, 'recovery')
    await user.click(screen.getByRole('button', { name: /search/i }))
    
    expect(fetch).toHaveBeenCalledWith('/api/literature/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'recovery',
        category: 'big_book',
        limit: 10
      })
    })
  })

  it('handles search API errors gracefully', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    ;(fetch as Mock).mockRejectedValueOnce(new Error('Search failed'))

    renderLiteraturePage()
    
    await waitFor(() => {
      expect(screen.getByText('Available Literature Sources:')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText(/search aa literature/i)
    await user.type(searchInput, 'test')
    await user.click(screen.getByRole('button', { name: /search/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Search temporarily unavailable. Please try again later.')).toBeInTheDocument()
    })
  })

  it('shows loading state during search', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    ;(fetch as Mock).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve(mockSearchResults)
      }), 100))
    )

    renderLiteraturePage()
    
    await waitFor(() => {
      expect(screen.getByText('Available Literature Sources:')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText(/search aa literature/i)
    await user.type(searchInput, 'recovery')
    await user.click(screen.getByRole('button', { name: /search/i }))
    
    expect(screen.getByText('Searching...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument()
    })
  })

  it('validates search input', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    renderLiteraturePage()
    
    await waitFor(() => {
      expect(screen.getByText('Available Literature Sources:')).toBeInTheDocument()
    })
    
    const searchButton = screen.getByRole('button', { name: /search/i })
    
    // Search button should be disabled with empty input
    expect(searchButton).toBeDisabled()
    
    const searchInput = screen.getByPlaceholderText(/search aa literature/i)
    await user.type(searchInput, 'test')
    
    // Should be enabled with text
    expect(searchButton).toBeEnabled()
  })

  it('displays compliance information', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    renderLiteraturePage()
    
    await waitFor(() => {
      expect(screen.getByText('✅ AA-Approved Literature Only')).toBeInTheDocument()
      expect(screen.getByText('🔒 Anonymous Access')).toBeInTheDocument()
      expect(screen.getByText('📜 Fair Use with Attribution')).toBeInTheDocument()
    })
  })

  it('allows browsing source content', async () => {
    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLiteratureSources)
    })

    const mockSourceContent = {
      source: {
        id: '1',
        title: 'Alcoholics Anonymous (Big Book)',
        category: 'big_book',
        author: 'Bill W. and AA Members',
        copyright: 'Copyright © AA World Services, Inc.'
      },
      content: {
        totalChunks: 2,
        chunks: [
          {
            id: '1',
            sectionTitle: 'Chapter 1',
            content: 'Chapter 1 content...',
            pageNumber: 1,
            chapterNumber: 1,
            wordCount: 100
          }
        ]
      },
      attribution: 'Alcoholics Anonymous (Big Book) by Bill W. and AA Members. Copyright © AA World Services, Inc.',
      fairUse: true
    }

    ;(fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSourceContent)
    })

    renderLiteraturePage()
    
    await waitFor(() => {
      expect(screen.getByText('Available Literature Sources:')).toBeInTheDocument()
    })
    
    const browseButton = screen.getByText('Browse Content')
    await user.click(browseButton)
    
    expect(fetch).toHaveBeenCalledWith('/api/literature/source/1')
    
    await waitFor(() => {
      expect(screen.getByText('Chapter 1 content...')).toBeInTheDocument()
      expect(screen.getByText('Alcoholics Anonymous (Big Book) by Bill W. and AA Members. Copyright © AA World Services, Inc.')).toBeInTheDocument()
    })
  })
})