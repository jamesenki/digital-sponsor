import React, { useState, useEffect } from 'react'
import type { Session, StepWorkDocument, ResentmentInventory, FearInventory, AmendsItem } from '@/types'
import StepWorkStorageService from '@/services/stepWorkStorage'
import StepWorkPDFService from '@/services/pdfService'
import FourthStepWorksheet from './FourthStepWorksheet'
import GenericStepWorksheet from './GenericStepWorksheet'
import AmendsWorksheet from './AmendsWorksheet'
import './StepWorkPage.css'

interface StepWorkPageProps {
  isOnline: boolean
  session: Session | null
}

/**
 * Step Work Page Component
 * 
 * Interactive AA step work with downloadable documents
 * Complete privacy - all data stored locally only
 */
function StepWorkPage({ isOnline, session }: StepWorkPageProps): JSX.Element {
  const [stepWorks, setStepWorks] = useState<StepWorkDocument[]>([])
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [storage] = useState(new StepWorkStorageService())
  const [pdfService] = useState(new StepWorkPDFService())

  // Load step work data on mount
  useEffect(() => {
    loadStepWork()
  }, [])

  const loadStepWork = () => {
    try {
      const allStepWork = storage.getAllStepWork()
      setStepWorks(allStepWork)
    } catch (error) {
      console.error('Failed to load step work:', error)
    }
  }

  const handleStepSelect = (stepNumber: number) => {
    setSelectedStep(selectedStep === stepNumber ? null : stepNumber)
  }

  const createNewStepWork = (stepNumber: number) => {
    const newStepWork: StepWorkDocument = {
      id: `step_${stepNumber}_${Date.now()}`,
      stepNumber,
      title: getStepTitle(stepNumber),
      createdAt: new Date(),
      updatedAt: new Date(),
      isComplete: false,
      privacy: 'local_only',
      content: {
        sections: []
      }
    }

    storage.saveStepWork(newStepWork)
    loadStepWork()
    setSelectedStep(stepNumber)
  }

  const handleDownloadPDF = async (stepNumber: number) => {
    setIsLoading(true)
    try {
      const stepWork = stepWorks.find(sw => sw.stepNumber === stepNumber)
      
      if (!stepWork) {
        throw new Error('Step work not found')
      }

      const blob = await pdfService.generateStepWorkPDF(stepWork)
      StepWorkPDFService.downloadPDF(blob, `Step_${stepNumber}_Worksheet.pdf`)
      
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadFourthStepPDF = async () => {
    setIsLoading(true)
    try {
      const resentments = storage.loadResentments()
      const fears = storage.loadFears()
      
      const blob = await pdfService.generateFourthStepPDF(resentments, fears)
      StepWorkPDFService.downloadPDF(blob, 'Fourth_Step_Inventory.pdf')
      
    } catch (error) {
      console.error('Failed to generate 4th Step PDF:', error)
      alert('Failed to generate 4th Step PDF. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadAmendsPDF = async () => {
    setIsLoading(true)
    try {
      const amends = storage.loadAmends()
      
      const blob = await pdfService.generateAmendsListPDF(amends)
      StepWorkPDFService.downloadPDF(blob, 'Amends_List.pdf')
      
    } catch (error) {
      console.error('Failed to generate Amends PDF:', error)
      alert('Failed to generate Amends PDF. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getStepTitle = (stepNumber: number): string => {
    const titles: { [key: number]: string } = {
      1: 'Powerlessness and Unmanageability',
      2: 'Coming to Believe',
      3: 'Decision to Turn Will and Life Over',
      4: 'Searching and Fearless Moral Inventory',
      5: 'Admitted to God, Ourselves and Another Human Being',
      6: 'Entirely Ready to Have God Remove Defects',
      7: 'Humbly Asked Him to Remove Our Shortcomings',
      8: 'List of All Persons We Had Harmed',
      9: 'Made Direct Amends',
      10: 'Continued Personal Inventory',
      11: 'Prayer and Meditation',
      12: 'Spiritual Awakening and Helping Others'
    }
    return titles[stepNumber] || `Step ${stepNumber}`
  }

  const getStepProgress = (stepNumber: number): number => {
    const stepWork = stepWorks.find(sw => sw.stepNumber === stepNumber)
    
    // Special handling for different step types
    if (stepNumber === 4) {
      // 4th Step: check resentments and fears
      const resentments = storage.loadResentments()
      const fears = storage.loadFears()
      
      if (resentments.length === 0 && fears.length === 0) return 0
      if (resentments.length > 0 && fears.length > 0) return 100
      if (resentments.length > 0 || fears.length > 0) return 50
    }
    
    if (stepNumber === 8 || stepNumber === 9) {
      // Steps 8 & 9: check amends list
      const amends = storage.loadAmends()
      if (amends.length === 0) return 0
      
      if (stepNumber === 8) {
        // Step 8: completion based on having a list
        return amends.length > 0 ? 100 : 0
      } else {
        // Step 9: completion based on completed amends
        const completedAmends = amends.filter(a => a.completed).length
        return amends.length > 0 ? Math.round((completedAmends / amends.length) * 100) : 0
      }
    }
    
    // Generic step work progress
    if (!stepWork) return 0
    
    const completedSections = stepWork.content.sections.filter(s => s.isComplete).length
    const totalSections = stepWork.content.sections.length
    
    return totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0
  }

  return (
    <div className="step-work-page" data-testid="step-work-page">
      {/* Header */}
      <div className="step-work-header">
        <h1>📋 AA Step Work</h1>
        <p>Interactive worksheets for working the Twelve Steps</p>
        
        {/* Privacy Notice */}
        <div className="privacy-notice">
          <span className="privacy-icon">🔒</span>
          <span>Completely Private - All data stored locally on your device only</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          className="action-button pdf-button"
          onClick={handleDownloadFourthStepPDF}
          disabled={isLoading}
        >
          📄 Download 4th Step Inventory PDF
        </button>
        
        <button 
          className="action-button pdf-button"
          onClick={handleDownloadAmendsPDF}
          disabled={isLoading}
        >
          📄 Download Amends List PDF
        </button>
        
        {isLoading && <div className="loading-spinner">Generating PDF...</div>}
      </div>

      {/* Steps Grid */}
      <div className="steps-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(stepNumber => {
          const hasStepWork = stepWorks.some(sw => sw.stepNumber === stepNumber) || 
                               (stepNumber === 4 && (storage.loadResentments().length > 0 || storage.loadFears().length > 0)) ||
                               ((stepNumber === 8 || stepNumber === 9) && storage.loadAmends().length > 0)
          const progress = getStepProgress(stepNumber)
          const isSelected = selectedStep === stepNumber

          return (
            <div 
              key={stepNumber}
              className={`step-card ${hasStepWork ? 'has-work' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleStepSelect(stepNumber)}
            >
              <div className="step-number">
                <span>Step {stepNumber}</span>
                {(hasStepWork || progress > 0) && (
                  <div className="progress-indicator">
                    <div 
                      className="progress-bar" 
                      style={{ '--progress': `${progress}%` } as React.CSSProperties}
                    />
                    <span className="progress-text">{progress}%</span>
                  </div>
                )}
              </div>
              
              <h3>{getStepTitle(stepNumber)}</h3>
              
              <div className="step-actions">
                {hasStepWork ? (
                  <>
                    <button 
                      className="action-button edit-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedStep(stepNumber)
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="action-button download-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadPDF(stepNumber)
                      }}
                      disabled={isLoading}
                    >
                      📥 PDF
                    </button>
                  </>
                ) : (
                  <button 
                    className="action-button new-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      createNewStepWork(stepNumber)
                    }}
                  >
                    ➕ Start
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step Work Content Area */}
      {selectedStep && (
        <div className="step-work-content">
          <div className="content-header">
            <h2>Step {selectedStep}: {getStepTitle(selectedStep)}</h2>
            <button 
              className="close-button"
              onClick={() => setSelectedStep(null)}
            >
              ✕
            </button>
          </div>
          
          <div className="content-body">
            {selectedStep === 4 ? (
              <FourthStepWorksheet storage={storage} />
            ) : selectedStep === 8 || selectedStep === 9 ? (
              <AmendsWorksheet stepNumber={selectedStep} storage={storage} />
            ) : (
              <GenericStepWorksheet 
                stepNumber={selectedStep} 
                storage={storage}
                onUpdate={loadStepWork}
              />
            )}
          </div>
        </div>
      )}

      {/* Guidance Section */}
      <div className="guidance-section">
        <h3>📚 Step Work Guidance</h3>
        <div className="guidance-items">
          <div className="guidance-item">
            <h4>Working with a Sponsor</h4>
            <p>Step work is best done with the guidance of a sponsor. Share your completed work when you're ready.</p>
          </div>
          
          <div className="guidance-item">
            <h4>Take Your Time</h4>
            <p>There's no rush. Thorough, honest work is more important than speed. Progress, not perfection.</p>
          </div>
          
          <div className="guidance-item">
            <h4>Privacy Guaranteed</h4>
            <p>All your step work is stored only on your device. Nothing is sent to any servers.</p>
          </div>
        </div>
      </div>

      {/* AA Traditions Compliance */}
      <div className="compliance-footer">
        <div className="compliance-items">
          <span>✅ AA Traditions Compliant</span>
          <span>🔒 Complete Anonymity</span>
          <span>📱 Offline Capable</span>
          <span>🤝 Sponsor-Friendly</span>
        </div>
      </div>
    </div>
  )
}

// Placeholder components for specific step worksheets (FourthStepWorksheet now imported)

// AmendsWorksheet now imported above

// GenericStepWorksheet now imported above

export default StepWorkPage