import React from 'react'
import type { Session } from '@/types'
import './ChatPage.css'

interface ChatPageProps {
  isOnline: boolean
  session: Session | null
}

/**
 * ChatPage Component - Placeholder
 * 
 * Will contain the main chat interface for AA literature Q&A
 */
export default function ChatPage({ isOnline, session }: ChatPageProps): JSX.Element {
  return (
    <div className="chat-page" data-testid="chat-page">
      <div className="chat-header">
        <h1>💬 Literature Chat</h1>
        <p>Ask questions about AA literature and receive guidance</p>
      </div>
      
      <div className="chat-container">
        <div className="messages-area" data-testid="messages-area">
          <div className="placeholder-message">
            <p>🤖 Hello! I'm here to help with questions about AA literature.</p>
            <p>📚 I can provide guidance based on the Big Book, 12 & 12, and other AA-approved materials.</p>
          </div>
        </div>
        
        <div className="input-area" data-testid="input-area">
          <div className="input-container">
            <textarea 
              placeholder="Ask a question about AA literature..."
              disabled={!isOnline}
              data-testid="chat-input"
            />
            <button 
              disabled={!isOnline}
              data-testid="send-button"
            >
              Send
            </button>
          </div>
          {!isOnline && (
            <p className="offline-notice">
              📵 Offline mode - Some features may be limited
            </p>
          )}
        </div>
      </div>
    </div>
  )
}