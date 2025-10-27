import React from 'react'
import type { Session } from '@/types'

interface StepWorkPageProps {
  isOnline: boolean
  session: Session | null
}

/**
 * StepWorkPage Component - Placeholder
 * 
 * Will contain guided step work and progress tracking
 */
export default function StepWorkPage({ isOnline, session }: StepWorkPageProps): JSX.Element {
  return (
    <div className="step-work-page" data-testid="step-work-page">
      <div className="step-work-header">
        <h1>📋 Step Work</h1>
        <p>Guided step work and personal inventory tools</p>
      </div>
      
      <div className="steps-overview" data-testid="steps-overview">
        <div className="steps-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i + 1} className="step-card">
              <h3>Step {i + 1}</h3>
              <p className="step-preview">
                {getStepPreview(i + 1)}
              </p>
              <div className="step-status">
                <span className="status-indicator">Not Started</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="step-work-tools">
        <h2>📝 Tools & Resources</h2>
        <div className="tools-grid">
          <div className="tool-card">
            <h3>🔍 Personal Inventory</h3>
            <p>Step 4 inventory worksheets and guidance</p>
          </div>
          
          <div className="tool-card">
            <h3>🙏 Daily Review</h3>
            <p>Step 10 daily inventory and reflection</p>
          </div>
          
          <div className="tool-card">
            <h3>📖 Step Study</h3>
            <p>Literature references for each step</p>
          </div>
        </div>
      </div>
      
      {!isOnline && (
        <div className="offline-notice">
          <p>📵 Offline mode - Limited functionality available</p>
        </div>
      )}
    </div>
  )
}

function getStepPreview(stepNumber: number): string {
  const previews = [
    "We admitted we were powerless...",
    "Came to believe that a Power greater...",
    "Made a decision to turn our will...",
    "Made a searching and fearless moral...",
    "Admitted to God, to ourselves...",
    "Were entirely ready to have God...",
    "Humbly asked Him to remove...",
    "Made a list of all persons we...",
    "Made direct amends to such people...",
    "Continued to take personal inventory...",
    "Sought through prayer and meditation...",
    "Having had a spiritual awakening..."
  ]
  
  return previews[stepNumber - 1] || ""
}