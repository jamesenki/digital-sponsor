import React, { useState, useEffect, useRef } from 'react'
import type { Session } from '@/types'
import './ChatPage.css'

interface ChatPageProps {
  isOnline: boolean
  session: Session | null
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
  confidence?: number
}

interface ChatResponse {
  response: {
    message: string
    sources: string[]
    context: string
    confidence: number
  }
  session: {
    id: string
    anonymous: boolean
  }
  compliance: {
    aa_traditions: boolean
    literature_only: boolean
    no_endorsements: boolean
  }
  timestamp: string
}

/**
 * ChatPage Component - AI-powered AA Literature Chat
 * 
 * Provides interactive chat interface for AA literature questions
 * Following AA Tradition 12 (anonymity) and Tradition 6 (no endorsements)
 */
export default function ChatPage({ isOnline, session }: ChatPageProps): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your Digital Sponsor, here to help with questions about AA literature. I can provide guidance based on the Big Book, Twelve Steps and Twelve Traditions, and other AA-approved materials. What would you like to explore today?",
      timestamp: new Date(),
      sources: ['Digital Sponsor System'],
      confidence: 1.0
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle sending messages
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isOnline) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          session_id: session?.id || 'anonymous'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ChatResponse = await response.json()

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response.message,
        timestamp: new Date(),
        sources: data.response.sources,
        confidence: data.response.confidence
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (err) {
      console.error('Chat error:', err)
      setError('Sorry, I encountered an error. Please try again.')
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. In a crisis, please use the red crisis button or call 988 for immediate support.",
        timestamp: new Date(),
        sources: ['Error Handler']
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Clear error when user starts typing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    if (error) setError(null)
  }

  return (
    <div className="chat-page" data-testid="chat-page">
      <div className="chat-header">
        <h1>💬 Literature Chat</h1>
        <p>Ask questions about AA literature and receive guidance</p>
        {!isOnline && (
          <div className="offline-banner">
            📵 Offline mode - Limited functionality available
          </div>
        )}
      </div>
      
      <div className="chat-container" data-testid="chat-container">
        <div className="messages-area" data-testid="messages-area">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role}`}
              data-testid={`message-${message.role}`}
            >
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                {message.sources && message.sources.length > 0 && (
                  <div className="message-sources">
                    <details>
                      <summary>📚 Sources</summary>
                      <ul>
                        {message.sources.map((source, index) => (
                          <li key={index}>{source}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
                {message.confidence && message.confidence < 0.7 && (
                  <div className="confidence-warning">
                    ⚠️ Please verify this guidance with your sponsor or at a meeting
                  </div>
                )}
              </div>
              <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message assistant loading" data-testid="loading-message">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="message-text">Thinking...</div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-area" data-testid="input-area">
          {error && (
            <div className="error-message" role="alert">
              ❌ {error}
            </div>
          )}
          
          <div className="input-container">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={isOnline ? "Ask a question about AA literature..." : "Offline mode - limited functionality"}
              disabled={!isOnline || isLoading}
              data-testid="chat-input"
              rows={2}
              maxLength={500}
            />
            <button
              onClick={sendMessage}
              disabled={!isOnline || isLoading || !inputValue.trim()}
              data-testid="send-button"
              className="send-button"
              aria-label="Send message"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
          
          <div className="input-help">
            <small>
              💡 Try asking: "What does Step 1 mean?" or "Tell me about powerlessness"
              {inputValue.length > 0 && (
                <span className="char-count"> • {inputValue.length}/500</span>
              )}
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}