import React, { useState, useEffect } from 'react'
import type { ResentmentInventory, FearInventory } from '@/types'
import StepWorkStorageService from '@/services/stepWorkStorage'
import './FourthStepWorksheet.css'

interface FourthStepWorksheetProps {
  storage: StepWorkStorageService
}

/**
 * Fourth Step Inventory Worksheet
 * 
 * Interactive forms for resentment and fear inventories
 * Big Book reference: Pages 64-71
 */
function FourthStepWorksheet({ storage }: FourthStepWorksheetProps): JSX.Element {
  const [resentments, setResentments] = useState<ResentmentInventory[]>([])
  const [fears, setFears] = useState<FearInventory[]>([])
  const [activeTab, setActiveTab] = useState<'resentments' | 'fears'>('resentments')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadInventories()
  }, [])

  const loadInventories = () => {
    try {
      const loadedResentments = storage.loadResentments()
      const loadedFears = storage.loadFears()
      setResentments(loadedResentments)
      setFears(loadedFears)
    } catch (error) {
      console.error('Failed to load inventories:', error)
    }
  }

  const addResentment = () => {
    const newResentment: ResentmentInventory = {
      id: `resentment_${Date.now()}`,
      person: '',
      cause: '',
      affects: {
        selfEsteem: false,
        pride: false,
        personalRelations: false,
        sexRelations: false,
        security: false,
        ambitions: false,
        pocketbook: false,
        other: ''
      },
      myPart: '',
      characterDefect: '',
      notes: ''
    }
    
    setResentments([...resentments, newResentment])
  }

  const updateResentment = (id: string, updates: Partial<ResentmentInventory>) => {
    setResentments(resentments.map(r => 
      r.id === id ? { ...r, ...updates } : r
    ))
  }

  const deleteResentment = (id: string) => {
    setResentments(resentments.filter(r => r.id !== id))
  }

  const addFear = () => {
    const newFear: FearInventory = {
      id: `fear_${Date.now()}`,
      fear: '',
      cause: '',
      affects: {
        selfEsteem: false,
        pride: false,
        personalRelations: false,
        sexRelations: false,
        security: false,
        ambitions: false,
        pocketbook: false,
        other: ''
      },
      notes: ''
    }
    
    setFears([...fears, newFear])
  }

  const updateFear = (id: string, updates: Partial<FearInventory>) => {
    setFears(fears.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ))
  }

  const deleteFear = (id: string) => {
    setFears(fears.filter(f => f.id !== id))
  }

  const saveInventories = async () => {
    setIsSaving(true)
    try {
      storage.saveResentments(resentments)
      storage.saveFears(fears)
      console.log('✅ 4th Step inventories saved')
    } catch (error) {
      console.error('Failed to save inventories:', error)
      alert('Failed to save inventories. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fourth-step-worksheet" data-testid="fourth-step-worksheet">
      {/* Header */}
      <div className="worksheet-header">
        <h3>📋 Fourth Step Inventory</h3>
        <p className="big-book-reference">
          <strong>Big Book Reference:</strong> Pages 64-71<br />
          "Made a searching and fearless moral inventory of ourselves"
        </p>
        
        <div className="guidance-box">
          <h4>📖 Instructions:</h4>
          <ul>
            <li>Be completely honest - this is between you and your Higher Power</li>
            <li>Focus on YOUR part in each situation</li>
            <li>Work with your sponsor when ready to review</li>
            <li>Take your time - thoroughness is more important than speed</li>
          </ul>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'resentments' ? 'active' : ''}`}
          onClick={() => setActiveTab('resentments')}
        >
          😡 Resentments ({resentments.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'fears' ? 'active' : ''}`}
          onClick={() => setActiveTab('fears')}
        >
          😰 Fears ({fears.length})
        </button>
      </div>

      {/* Save Button */}
      <div className="save-section">
        <button 
          className="save-button"
          onClick={saveInventories}
          disabled={isSaving}
        >
          {isSaving ? '💾 Saving...' : '💾 Save Inventories'}
        </button>
        <span className="save-status">
          🔒 Saved locally only - completely private
        </span>
      </div>

      {/* Resentments Tab */}
      {activeTab === 'resentments' && (
        <div className="inventory-section">
          <div className="section-header">
            <h4>Resentment Inventory</h4>
            <p>List people, institutions, or principles that you resent</p>
            <button className="add-button" onClick={addResentment}>
              ➕ Add Resentment
            </button>
          </div>

          {resentments.length === 0 ? (
            <div className="empty-state">
              <p>No resentments added yet. Click "Add Resentment" to start your inventory.</p>
            </div>
          ) : (
            <div className="inventory-items">
              {resentments.map((resentment, index) => (
                <ResentmentForm
                  key={resentment.id}
                  resentment={resentment}
                  index={index + 1}
                  onUpdate={updateResentment}
                  onDelete={deleteResentment}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fears Tab */}
      {activeTab === 'fears' && (
        <div className="inventory-section">
          <div className="section-header">
            <h4>Fear Inventory</h4>
            <p>List your fears and what causes them</p>
            <button className="add-button" onClick={addFear}>
              ➕ Add Fear
            </button>
          </div>

          {fears.length === 0 ? (
            <div className="empty-state">
              <p>No fears added yet. Click "Add Fear" to start your fear inventory.</p>
            </div>
          ) : (
            <div className="inventory-items">
              {fears.map((fear, index) => (
                <FearForm
                  key={fear.id}
                  fear={fear}
                  index={index + 1}
                  onUpdate={updateFear}
                  onDelete={deleteFear}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ResentmentFormProps {
  resentment: ResentmentInventory
  index: number
  onUpdate: (id: string, updates: Partial<ResentmentInventory>) => void
  onDelete: (id: string) => void
}

function ResentmentForm({ resentment, index, onUpdate, onDelete }: ResentmentFormProps) {
  const handleAffectsChange = (key: keyof ResentmentInventory['affects'], value: boolean | string) => {
    onUpdate(resentment.id, {
      affects: { ...resentment.affects, [key]: value }
    })
  }

  return (
    <div className="inventory-form resentment-form">
      <div className="form-header">
        <h5>Resentment #{index}</h5>
        <button 
          className="delete-button"
          onClick={() => onDelete(resentment.id)}
          title="Delete this resentment"
        >
          🗑️
        </button>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Person, Institution, or Principle:</label>
          <input
            type="text"
            value={resentment.person}
            onChange={(e) => onUpdate(resentment.id, { person: e.target.value })}
            placeholder="Who or what do you resent?"
          />
        </div>
        
        <div className="form-group">
          <label>The Cause (What they did):</label>
          <textarea
            value={resentment.cause}
            onChange={(e) => onUpdate(resentment.id, { cause: e.target.value })}
            placeholder="What did they do that hurt you?"
            rows={2}
          />
        </div>
      </div>

      <div className="affects-section">
        <label>This Affects My:</label>
        <div className="affects-grid">
          {[
            { key: 'selfEsteem', label: 'Self-Esteem' },
            { key: 'pride', label: 'Pride' },
            { key: 'personalRelations', label: 'Personal Relations' },
            { key: 'sexRelations', label: 'Sex Relations' },
            { key: 'security', label: 'Security' },
            { key: 'ambitions', label: 'Ambitions' },
            { key: 'pocketbook', label: 'Pocketbook' }
          ].map(({ key, label }) => (
            <label key={key} className="checkbox-label">
              <input
                type="checkbox"
                checked={resentment.affects[key as keyof typeof resentment.affects] as boolean}
                onChange={(e) => handleAffectsChange(key as keyof ResentmentInventory['affects'], e.target.checked)}
              />
              {label}
            </label>
          ))}
          <div className="form-group">
            <input
              type="text"
              value={resentment.affects.other}
              onChange={(e) => handleAffectsChange('other', e.target.value)}
              placeholder="Other areas affected..."
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>My Part (What was my role?):</label>
          <textarea
            value={resentment.myPart}
            onChange={(e) => onUpdate(resentment.id, { myPart: e.target.value })}
            placeholder="How did I contribute to this situation?"
            rows={2}
          />
        </div>
        
        <div className="form-group">
          <label>Character Defect Revealed:</label>
          <input
            type="text"
            value={resentment.characterDefect}
            onChange={(e) => onUpdate(resentment.id, { characterDefect: e.target.value })}
            placeholder="Selfishness, dishonesty, fear, inconsideration..."
          />
        </div>
      </div>

      <div className="form-group">
        <label>Additional Notes:</label>
        <textarea
          value={resentment.notes || ''}
          onChange={(e) => onUpdate(resentment.id, { notes: e.target.value })}
          placeholder="Any additional thoughts or insights..."
          rows={2}
        />
      </div>
    </div>
  )
}

interface FearFormProps {
  fear: FearInventory
  index: number
  onUpdate: (id: string, updates: Partial<FearInventory>) => void
  onDelete: (id: string) => void
}

function FearForm({ fear, index, onUpdate, onDelete }: FearFormProps) {
  const handleAffectsChange = (key: keyof FearInventory['affects'], value: boolean | string) => {
    onUpdate(fear.id, {
      affects: { ...fear.affects, [key]: value }
    })
  }

  return (
    <div className="inventory-form fear-form">
      <div className="form-header">
        <h5>Fear #{index}</h5>
        <button 
          className="delete-button"
          onClick={() => onDelete(fear.id)}
          title="Delete this fear"
        >
          🗑️
        </button>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Fear:</label>
          <input
            type="text"
            value={fear.fear}
            onChange={(e) => onUpdate(fear.id, { fear: e.target.value })}
            placeholder="What are you afraid of?"
          />
        </div>
        
        <div className="form-group">
          <label>Why (The Cause):</label>
          <textarea
            value={fear.cause}
            onChange={(e) => onUpdate(fear.id, { cause: e.target.value })}
            placeholder="Why does this frighten you?"
            rows={2}
          />
        </div>
      </div>

      <div className="affects-section">
        <label>This Affects My:</label>
        <div className="affects-grid">
          {[
            { key: 'selfEsteem', label: 'Self-Esteem' },
            { key: 'pride', label: 'Pride' },
            { key: 'personalRelations', label: 'Personal Relations' },
            { key: 'sexRelations', label: 'Sex Relations' },
            { key: 'security', label: 'Security' },
            { key: 'ambitions', label: 'Ambitions' },
            { key: 'pocketbook', label: 'Pocketbook' }
          ].map(({ key, label }) => (
            <label key={key} className="checkbox-label">
              <input
                type="checkbox"
                checked={fear.affects[key as keyof typeof fear.affects] as boolean}
                onChange={(e) => handleAffectsChange(key as keyof FearInventory['affects'], e.target.checked)}
              />
              {label}
            </label>
          ))}
          <div className="form-group">
            <input
              type="text"
              value={fear.affects.other}
              onChange={(e) => handleAffectsChange('other', e.target.value)}
              placeholder="Other areas affected..."
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Additional Notes:</label>
        <textarea
          value={fear.notes || ''}
          onChange={(e) => onUpdate(fear.id, { notes: e.target.value })}
          placeholder="Any additional thoughts or insights..."
          rows={2}
        />
      </div>
    </div>
  )
}

export default FourthStepWorksheet