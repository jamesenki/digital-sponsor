import React from 'react'
import './CrisisModal.css'

interface CrisisModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * CrisisModal Component
 * 
 * Emergency crisis support modal with immediate help resources
 * Always available regardless of app state
 */
export default function CrisisModal({ isOpen, onClose }: CrisisModalProps): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div 
      className="crisis-modal-overlay" 
      data-testid="crisis-modal"
      role="dialog"
      aria-labelledby="crisis-title"
      aria-describedby="crisis-description"
    >
      <div className="crisis-modal-content">
        <div className="crisis-header">
          <h2 id="crisis-title">🆘 Crisis Support</h2>
          <button 
            className="close-button"
            onClick={onClose}
            aria-label="Close crisis modal"
            data-testid="close-crisis-modal"
          >
            ✕
          </button>
        </div>
        
        <div id="crisis-description" className="crisis-body">
          <div className="immediate-help">
            <h3>🚨 Immediate Help</h3>
            <div className="crisis-contacts">
              <div className="contact-item">
                <strong>988 Suicide & Crisis Lifeline</strong>
                <p>Call or text 988</p>
                <p>24/7 free and confidential support</p>
              </div>
              
              <div className="contact-item">
                <strong>Crisis Text Line</strong>
                <p>Text HOME to 741741</p>
                <p>Free 24/7 crisis counseling</p>
              </div>
              
              <div className="contact-item">
                <strong>Emergency Services</strong>
                <p>Call 911</p>
                <p>For immediate medical emergencies</p>
              </div>
            </div>
          </div>
          
          <div className="aa-resources">
            <h3>🤝 AA Emergency Contacts</h3>
            <div className="aa-contacts">
              <div className="contact-item">
                <strong>AA General Service Office</strong>
                <p>(212) 870-3400</p>
                <p>For finding local meetings and contacts</p>
              </div>
              
              <div className="contact-item">
                <strong>Local AA Hotline</strong>
                <p>Check your local AA directory</p>
                <p>24/7 support from local members</p>
              </div>
            </div>
          </div>
          
          <div className="safety-notice">
            <p>
              <strong>Remember:</strong> You are not alone. Help is available 24/7.
              If you're having thoughts of self-harm, please reach out immediately.
            </p>
          </div>
        </div>
        
        <div className="crisis-footer">
          <button 
            className="primary-button"
            onClick={() => window.open('tel:988')}
            data-testid="call-988"
          >
            📞 Call 988
          </button>
          <button 
            className="secondary-button"
            onClick={onClose}
            data-testid="close-modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}