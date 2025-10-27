import React from 'react'
import type { Session } from '@/types'

interface HomePageProps {
  isOnline: boolean
  session: Session | null
}

/**
 * HomePage Component - Placeholder
 */
export default function HomePage({ isOnline, session }: HomePageProps): JSX.Element {
  return (
    <div className="home-page" data-testid="home-page">
      <h1>🤝 Welcome to Digital Sponsor</h1>
      <p>AI-powered AA literature companion</p>
      <div className="status">
        <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
        <p>Session: {session ? 'Active' : 'None'}</p>
      </div>
    </div>
  )
}