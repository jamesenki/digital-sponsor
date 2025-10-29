import React, { useState, useEffect } from 'react'
import type { StepWorkDocument, StepWorkSection } from '@/types'
import StepWorkStorageService from '@/services/stepWorkStorage'
import { stepWorkTemplates } from '@/templates/stepWorkTemplates'
import './GenericStepWorksheet.css'

interface GenericStepWorksheetProps {
  stepNumber: number
  storage: StepWorkStorageService
  onUpdate: () => void
}

/**
 * Generic Step Worksheet Component
 * 
 * Handles steps 1-3, 5-7, 10-12 with templated prompts and text areas
 * Provides structured guidance for working each step
 */
function GenericStepWorksheet({ stepNumber, storage, onUpdate }: GenericStepWorksheetProps): JSX.Element {
  const [stepWork, setStepWork] = useState<StepWorkDocument | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    loadStepWork()
  }, [stepNumber])

  const loadStepWork = () => {
    try {
      const existingWork = storage.loadStepWork(stepNumber)
      
      if (existingWork) {
        setStepWork(existingWork)
      } else {
        // Create new step work with template
        const template = stepWorkTemplates[`step${stepNumber}` as keyof typeof stepWorkTemplates]
        if (template && template.sections && Array.isArray(template.sections)) {
          const newStepWork: StepWorkDocument = {
            id: `step_${stepNumber}_${Date.now()}`,
            stepNumber,
            title: template.title,
            createdAt: new Date(),
            updatedAt: new Date(),
            isComplete: false,
            privacy: 'local_only',
            content: {
              sections: template.sections.map((section: any, index: number) => ({
                id: `section_${index}_${Date.now()}`,
                title: section.title,
                type: 'text' as const,
                content: '',
                isComplete: false
              }))
            }
          }
          setStepWork(newStepWork)
          storage.saveStepWork(newStepWork)
          onUpdate()
        } else {
          // Fallback for steps without templates
          const defaultStepWork: StepWorkDocument = {
            id: `step_${stepNumber}_${Date.now()}`,
            stepNumber,
            title: getStepTitle(stepNumber),
            createdAt: new Date(),
            updatedAt: new Date(),
            isComplete: false,
            privacy: 'local_only',
            content: {
              sections: [{
                id: `section_1_${Date.now()}`,
                title: `Step ${stepNumber} Work`,
                type: 'text' as const,
                content: '',
                isComplete: false
              }]
            }
          }
          setStepWork(defaultStepWork)
          storage.saveStepWork(defaultStepWork)
          onUpdate()
        }
      }
    } catch (error) {
      console.error('Failed to load step work:', error)
    }
  }

  const updateSection = (sectionId: string, content: any) => {
    if (!stepWork) return

    const updatedSections = stepWork.content.sections.map(section => 
      section.id === sectionId 
        ? { ...section, content, isComplete: content && content.trim().length > 0 }
        : section
    )

    const updatedStepWork = {
      ...stepWork,
      content: {
        ...stepWork.content,
        sections: updatedSections
      },
      updatedAt: new Date(),
      isComplete: updatedSections.every(s => s.isComplete)
    }

    setStepWork(updatedStepWork)
    setHasUnsavedChanges(true)
  }

  const saveStepWork = async () => {
    if (!stepWork) return

    setIsSaving(true)
    try {
      storage.saveStepWork(stepWork)
      setHasUnsavedChanges(false)
      onUpdate()
      console.log(`✅ Step ${stepNumber} work saved`)
    } catch (error) {
      console.error('Failed to save step work:', error)
      alert('Failed to save step work. Please try again.')
    } finally {
      setIsSaving(false)
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

  const getStepReference = (stepNumber: number): { text: string; page?: string } => {
    const references: { [key: number]: { text: string; page?: string } } = {
      1: { text: 'We admitted we were powerless over alcohol—that our lives had become unmanageable.', page: 'Page 59' },
      2: { text: 'Came to believe that a Power greater than ourselves could restore us to sanity.', page: 'Page 59' },
      3: { text: 'Made a decision to turn our will and our lives over to the care of God as we understood Him.', page: 'Page 59' },
      5: { text: 'Admitted to God, to ourselves, and to another human being the exact nature of our wrongs.', page: 'Page 59' },
      6: { text: 'Were entirely ready to have God remove all these defects of character.', page: 'Page 59' },
      7: { text: 'Humbly asked Him to remove our shortcomings.', page: 'Page 59' },
      10: { text: 'Continued to take personal inventory and when we were wrong promptly admitted it.', page: 'Page 59' },
      11: { text: 'Sought through prayer and meditation to improve our conscious contact with God...', page: 'Page 59' },
      12: { text: 'Having had a spiritual awakening as the result of these Steps...', page: 'Page 59' }
    }
    return references[stepNumber] || { text: `Step ${stepNumber}` }
  }

  const getCompletionProgress = (): number => {
    if (!stepWork) return 0
    const completedSections = stepWork.content.sections.filter(s => s.isComplete).length
    const totalSections = stepWork.content.sections.length
    return totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0
  }

  if (!stepWork) {
    return (
      <div className="generic-step-worksheet loading">
        <p>Loading step work...</p>
      </div>
    )
  }

  const reference = getStepReference(stepNumber)
  const progress = getCompletionProgress()

  return (
    <div className="generic-step-worksheet" data-testid="generic-step-worksheet">
      {/* Header */}
      <div className="worksheet-header">
        <h3>📋 Step {stepNumber} Worksheet</h3>
        <p className="step-text">
          <strong>"{reference.text}"</strong>
          {reference.page && <span className="page-ref"> - {reference.page}</span>}
        </p>
        
        <div className="progress-section">
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{progress}% Complete</span>
        </div>
      </div>

      {/* Save Section */}
      <div className="save-section">
        <button 
          className={`save-button ${hasUnsavedChanges ? 'has-changes' : ''}`}
          onClick={saveStepWork}
          disabled={isSaving}
        >
          {isSaving ? '💾 Saving...' : hasUnsavedChanges ? '💾 Save Changes' : '✅ Saved'}
        </button>
        <span className="save-status">
          🔒 Stored locally only - completely private
        </span>
      </div>

      {/* Sections */}
      <div className="worksheet-sections">
        {stepWork.content.sections.map((section, index) => (
          <WorksheetSection
            key={section.id}
            section={section}
            index={index + 1}
            onUpdate={(content) => updateSection(section.id, content)}
          />
        ))}
      </div>

      {/* Guidance */}
      <div className="step-guidance">
        <h4>📖 Step {stepNumber} Guidance</h4>
        <div className="guidance-items">
          <div className="guidance-item">
            <h5>📚 Suggested Reading</h5>
            <p>Review Step {stepNumber} in the Big Book and Twelve Steps and Twelve Traditions before beginning.</p>
          </div>
          
          <div className="guidance-item">
            <h5>🤝 Work with Your Sponsor</h5>
            <p>Share your completed work with your sponsor when you're ready. Their guidance is invaluable.</p>
          </div>
          
          <div className="guidance-item">
            <h5>⏰ Take Your Time</h5>
            <p>There's no rush. Honest, thorough work is more important than speed. Progress, not perfection.</p>
          </div>
          
          <div className="guidance-item">
            <h5>🙏 Prayer & Meditation</h5>
            <p>Begin each session with prayer or meditation. Ask your Higher Power for guidance and honesty.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface WorksheetSectionProps {
  section: StepWorkSection
  index: number
  onUpdate: (content: any) => void
}

function WorksheetSection({ section, index, onUpdate }: WorksheetSectionProps) {
  const [localContent, setLocalContent] = useState(section.content || '')

  useEffect(() => {
    setLocalContent(section.content || '')
  }, [section.content])

  const handleChange = (value: string) => {
    setLocalContent(value)
    onUpdate(value)
  }

  const renderSectionContent = () => {
    switch (section.type) {
      case 'text':
        return (
          <textarea
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Write your thoughts, experiences, and reflections here..."
            rows={6}
            className="section-textarea"
          />
        )
        
      case 'list':
        return (
          <div className="list-section">
            <textarea
              value={localContent}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="List items one per line..."
              rows={8}
              className="section-textarea list-textarea"
            />
            <div className="list-help">
              <small>💡 Write each item on a separate line</small>
            </div>
          </div>
        )
        
      case 'reflection':
        return (
          <div className="reflection-section">
            <div className="reflection-prompt">
              <p>{section.content}</p>
            </div>
            <textarea
              value={localContent}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Reflect deeply and write your honest thoughts..."
              rows={8}
              className="section-textarea reflection-textarea"
            />
          </div>
        )
        
      default:
        return (
          <textarea
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Write your response here..."
            rows={4}
            className="section-textarea"
          />
        )
    }
  }

  return (
    <div className={`worksheet-section ${section.isComplete ? 'completed' : ''}`}>
      <div className="section-header">
        <h4>
          <span className="section-number">{index}.</span>
          {section.title}
          {section.isComplete && <span className="completion-indicator">✅</span>}
        </h4>
      </div>
      
      <div className="section-content">
        {renderSectionContent()}
      </div>
    </div>
  )
}

export default GenericStepWorksheet