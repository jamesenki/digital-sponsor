import React, { useState, useEffect } from 'react'
import type { AmendsItem } from '@/types'
import StepWorkStorageService from '@/services/stepWorkStorage'
import './AmendsWorksheet.css'

interface AmendsWorksheetProps {
  stepNumber: number
  storage: StepWorkStorageService
}

/**
 * Amends Worksheet Component
 * 
 * Interactive amends planning and tracking for Steps 8 & 9
 * Step 8: List of all persons we had harmed
 * Step 9: Making direct amends
 */
function AmendsWorksheet({ stepNumber, storage }: AmendsWorksheetProps): JSX.Element {
  const [amends, setAmends] = useState<AmendsItem[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadAmends()
  }, [])

  const loadAmends = () => {
    try {
      const loadedAmends = storage.loadAmends()
      setAmends(loadedAmends)
    } catch (error) {
      console.error('Failed to load amends:', error)
    }
  }

  const addAmend = () => {
    const newAmend: AmendsItem = {
      id: `amend_${Date.now()}`,
      person: '',
      harm: '',
      willingness: 'willing',
      method: '',
      timing: '',
      notes: '',
      completed: false
    }
    
    setAmends([...amends, newAmend])
  }

  const updateAmend = (id: string, updates: Partial<AmendsItem>) => {
    setAmends(amends.map(a => 
      a.id === id ? { ...a, ...updates } : a
    ))
  }

  const deleteAmend = (id: string) => {
    setAmends(amends.filter(a => a.id !== id))
  }

  const markCompleted = (id: string, completed: boolean) => {
    updateAmend(id, { 
      completed, 
      completedDate: completed ? new Date() : undefined 
    })
  }

  const saveAmends = async () => {
    setIsSaving(true)
    try {
      storage.saveAmends(amends)
      console.log('✅ Amends list saved')
    } catch (error) {
      console.error('Failed to save amends:', error)
      alert('Failed to save amends list. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const getStepInstructions = (stepNumber: number) => {
    if (stepNumber === 8) {
      return {
        title: 'Step 8 - List of All Persons We Had Harmed',
        bigBookText: '"Made a list of all persons we had harmed, and became willing to make amends to them all."',
        instructions: [
          'List everyone you have harmed, including yourself',
          'Be thorough - include family, friends, employers, strangers',
          'Focus on YOUR actions and their impact on others',
          'Become willing to make amends to ALL - even those who also harmed you',
          'Don\'t worry about HOW yet - that\'s Step 9'
        ]
      }
    } else {
      return {
        title: 'Step 9 - Made Direct Amends',
        bigBookText: '"Made direct amends to such people wherever possible, except when to do so would injure them or others."',
        instructions: [
          'Work with your sponsor to plan each amends',
          'Consider the timing and method carefully',
          'Be willing to make financial restitution when possible',
          'Do not make amends that would injure them or others',
          'Some amends may need to wait for the right timing'
        ]
      }
    }
  }

  const instructions = getStepInstructions(stepNumber)
  const completedAmends = amends.filter(a => a.completed).length
  const totalAmends = amends.length

  return (
    <div className="amends-worksheet" data-testid="amends-worksheet">
      {/* Header */}
      <div className="worksheet-header">
        <h3>🤝 {instructions.title}</h3>
        <p className="big-book-reference">
          <strong>Big Book Reference:</strong> Page 76-84<br />
          <em>{instructions.bigBookText}</em>
        </p>
        
        <div className="guidance-box">
          <h4>📖 Instructions:</h4>
          <ul>
            {instructions.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ul>
        </div>

        {stepNumber === 9 && (
          <div className="warning-box">
            <h4>⚠️ Important Cautions for Step 9:</h4>
            <ul>
              <li><strong>Always consult your sponsor</strong> before making amends</li>
              <li><strong>Do not</strong> make amends that would injure them or others</li>
              <li><strong>Some amends are "living amends"</strong> - changed behavior over time</li>
              <li><strong>Timing matters</strong> - some amends must wait for the right moment</li>
              <li><strong>Safety first</strong> - don't put yourself or others in danger</li>
            </ul>
          </div>
        )}
      </div>

      {/* Progress & Save */}
      <div className="progress-save-section">
        <div className="progress-info">
          <span className="progress-count">{completedAmends} of {totalAmends} amends completed</span>
          {totalAmends > 0 && (
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${(completedAmends / totalAmends) * 100}%` }}
              />
            </div>
          )}
        </div>
        
        <button 
          className="save-button"
          onClick={saveAmends}
          disabled={isSaving}
        >
          {isSaving ? '💾 Saving...' : '💾 Save Amends List'}
        </button>
      </div>

      <div className="add-section">
        <button className="add-button" onClick={addAmend}>
          ➕ Add {stepNumber === 8 ? 'Person to List' : 'Amends to Make'}
        </button>
        <span className="privacy-notice">
          🔒 Saved locally only - completely private
        </span>
      </div>

      {/* Amends List */}
      {amends.length === 0 ? (
        <div className="empty-state">
          <p>No amends added yet. Click "Add {stepNumber === 8 ? 'Person to List' : 'Amends to Make'}" to start your {stepNumber === 8 ? 'list' : 'amends work'}.</p>
        </div>
      ) : (
        <div className="amends-list">
          {amends.map((amend, index) => (
            <AmendForm
              key={amend.id}
              amend={amend}
              index={index + 1}
              stepNumber={stepNumber}
              onUpdate={updateAmend}
              onDelete={deleteAmend}
              onMarkCompleted={markCompleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface AmendFormProps {
  amend: AmendsItem
  index: number
  stepNumber: number
  onUpdate: (id: string, updates: Partial<AmendsItem>) => void
  onDelete: (id: string) => void
  onMarkCompleted: (id: string, completed: boolean) => void
}

function AmendForm({ amend, index, stepNumber, onUpdate, onDelete, onMarkCompleted }: AmendFormProps) {
  const willingness_options = [
    { value: 'willing', label: '✅ Willing', color: 'var(--success-color)' },
    { value: 'not_ready', label: '⏳ Not Ready Yet', color: 'var(--warning-color)' },
    { value: 'impossible', label: '❌ Not Possible', color: 'var(--crisis-color)' }
  ]

  const getWillingnessColor = (willingness: string) => {
    const option = willingness_options.find(opt => opt.value === willingness)
    return option ? option.color : 'var(--text-color)'
  }

  return (
    <div className={`amend-form ${amend.completed ? 'completed' : ''}`}>
      <div className="form-header">
        <h5>
          {stepNumber === 8 ? `Person #${index}` : `Amends #${index}`}
          {amend.completed && <span className="completed-badge">✅ Completed</span>}
        </h5>
        <div className="header-actions">
          {stepNumber === 9 && (
            <button
              className={`completion-button ${amend.completed ? 'undo' : 'complete'}`}
              onClick={() => onMarkCompleted(amend.id, !amend.completed)}
              title={amend.completed ? 'Mark as incomplete' : 'Mark as completed'}
            >
              {amend.completed ? '↶ Undo' : '✅ Complete'}
            </button>
          )}
          <button 
            className="delete-button"
            onClick={() => onDelete(amend.id)}
            title="Delete this amend"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Person/Institution:</label>
          <input
            type="text"
            value={amend.person}
            onChange={(e) => onUpdate(amend.id, { person: e.target.value })}
            placeholder="Who did you harm?"
          />
        </div>
        
        <div className="form-group">
          <label>Nature of Harm:</label>
          <textarea
            value={amend.harm}
            onChange={(e) => onUpdate(amend.id, { harm: e.target.value })}
            placeholder="What harm did you cause?"
            rows={2}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Willingness:</label>
          <select
            value={amend.willingness}
            onChange={(e) => onUpdate(amend.id, { willingness: e.target.value as AmendsItem['willingness'] })}
            style={{ color: getWillingnessColor(amend.willingness) }}
          >
            {willingness_options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {stepNumber === 9 && (
          <div className="form-group">
            <label>Method of Amends:</label>
            <input
              type="text"
              value={amend.method || ''}
              onChange={(e) => onUpdate(amend.id, { method: e.target.value })}
              placeholder="In person, letter, phone, financial, living amends..."
            />
          </div>
        )}
      </div>

      {stepNumber === 9 && (
        <div className="form-row">
          <div className="form-group">
            <label>Timing/Plan:</label>
            <textarea
              value={amend.timing || ''}
              onChange={(e) => onUpdate(amend.id, { timing: e.target.value })}
              placeholder="When and how will you make this amends? Discuss with sponsor."
              rows={2}
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Notes:</label>
        <textarea
          value={amend.notes || ''}
          onChange={(e) => onUpdate(amend.id, { notes: e.target.value })}
          placeholder="Additional thoughts, sponsor guidance, outcome if completed..."
          rows={2}
        />
      </div>

      {amend.completed && amend.completedDate && (
        <div className="completion-info">
          <small>✅ Completed on {new Date(amend.completedDate).toLocaleDateString()}</small>
        </div>
      )}
    </div>
  )
}

export default AmendsWorksheet