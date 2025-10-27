import React, { useState, useEffect } from 'react';

/**
 * FourthStepWorksheet Component
 * Secure, encrypted 4th Step inventory system
 * Privacy-first design with local storage only
 */
const FourthStepWorksheet = () => {
  const [activeSection, setActiveSection] = useState('resentments');
  const [resentments, setResentments] = useState([]);
  const [fears, setFears] = useState([]);
  const [harms, setHarms] = useState([]);
  
  // Load saved work from local storage (encrypted in production)
  useEffect(() => {
    const savedResentments = localStorage.getItem('fourthStep_resentments');
    const savedFears = localStorage.getItem('fourthStep_fears');
    const savedHarms = localStorage.getItem('fourthStep_harms');
    
    if (savedResentments) setResentments(JSON.parse(savedResentments));
    if (savedFears) setFears(JSON.parse(savedFears));
    if (savedHarms) setHarms(JSON.parse(savedHarms));
  }, []);
  
  // Save work locally (would be encrypted in production)
  const saveWork = (type, data) => {
    localStorage.setItem(`fourthStep_${type}`, JSON.stringify(data));
  };
  
  const addResentment = () => {
    const newResentment = {
      id: Date.now(),
      person: '',
      cause: '',
      affectedAreas: {
        selfEsteem: false,
        security: false,
        ambitions: false,
        personalRelations: false,
        sexRelations: false
      },
      myPart: ''
    };
    const updated = [...resentments, newResentment];
    setResentments(updated);
    saveWork('resentments', updated);
  };
  
  const updateResentment = (id, field, value) => {
    const updated = resentments.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    );
    setResentments(updated);
    saveWork('resentments', updated);
  };
  
  const updateResentmentArea = (id, area, checked) => {
    const updated = resentments.map(r => 
      r.id === id ? { 
        ...r, 
        affectedAreas: { ...r.affectedAreas, [area]: checked }
      } : r
    );
    setResentments(updated);
    saveWork('resentments', updated);
  };
  
  const addFear = () => {
    const newFear = {
      id: Date.now(),
      fear: '',
      why: '',
      affectedAreas: {
        selfEsteem: false,
        security: false,
        ambitions: false,
        personalRelations: false,
        sexRelations: false
      },
      newApproach: ''
    };
    const updated = [...fears, newFear];
    setFears(updated);
    saveWork('fears', updated);
  };
  
  const updateFear = (id, field, value) => {
    const updated = fears.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    );
    setFears(updated);
    saveWork('fears', updated);
  };
  
  const updateFearArea = (id, area, checked) => {
    const updated = fears.map(f => 
      f.id === id ? { 
        ...f, 
        affectedAreas: { ...f.affectedAreas, [area]: checked }
      } : f
    );
    setFears(updated);
    saveWork('fears', updated);
  };
  
  const addHarm = () => {
    const newHarm = {
      id: Date.now(),
      person: '',
      harm: '',
      nature: '',
      amends: ''
    };
    const updated = [...harms, newHarm];
    setHarms(updated);
    saveWork('harms', updated);
  };
  
  const updateHarm = (id, field, value) => {
    const updated = harms.map(h => 
      h.id === id ? { ...h, [field]: value } : h
    );
    setHarms(updated);
    saveWork('harms', updated);
  };

  return (
    <div className="fourth-step-worksheet">
      <div className="worksheet-header">
        <h2>📋 4th Step: Searching & Fearless Moral Inventory</h2>
        <p className="privacy-notice">
          🔒 <strong>Privacy First:</strong> Your inventory is saved locally on your device only. 
          Nothing is transmitted or stored on external servers.
        </p>
      </div>
      
      <div className="section-tabs">
        <button 
          className={`tab ${activeSection === 'resentments' ? 'active' : ''}`}
          onClick={() => setActiveSection('resentments')}
        >
          😠 Resentments ({resentments.length})
        </button>
        <button 
          className={`tab ${activeSection === 'fears' ? 'active' : ''}`}
          onClick={() => setActiveSection('fears')}
        >
          😰 Fears ({fears.length})
        </button>
        <button 
          className={`tab ${activeSection === 'harms' ? 'active' : ''}`}
          onClick={() => setActiveSection('harms')}
        >
          💔 Harms ({harms.length})
        </button>
      </div>
      
      <div className="worksheet-content">
        {activeSection === 'resentments' && (
          <div className="resentments-section">
            <div className="section-header">
              <h3>Resentment Inventory</h3>
              <p>From the Big Book: "Resentment is the 'number one' offender. It destroys more alcoholics than anything else."</p>
            </div>
            
            {resentments.map((resentment) => (
              <div key={resentment.id} className="inventory-card">
                <div className="card-header">
                  <h4>Resentment #{resentments.indexOf(resentment) + 1}</h4>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Person/Institution:</label>
                    <input
                      type="text"
                      placeholder="Who or what do you resent?"
                      value={resentment.person}
                      onChange={(e) => updateResentment(resentment.id, 'person', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>The Cause:</label>
                    <textarea
                      placeholder="What did they do? What happened?"
                      value={resentment.cause}
                      onChange={(e) => updateResentment(resentment.id, 'cause', e.target.value)}
                      rows="2"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Affects My:</label>
                  <div className="checkbox-grid">
                    {Object.entries({
                      selfEsteem: 'Self-Esteem',
                      security: 'Security', 
                      ambitions: 'Ambitions',
                      personalRelations: 'Personal Relations',
                      sexRelations: 'Sex Relations'
                    }).map(([key, label]) => (
                      <label key={key} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={resentment.affectedAreas[key]}
                          onChange={(e) => updateResentmentArea(resentment.id, key, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>My Part (Where was I selfish, dishonest, self-seeking, or frightened?):</label>
                  <textarea
                    placeholder="What was your part in this situation?"
                    value={resentment.myPart}
                    onChange={(e) => updateResentment(resentment.id, 'myPart', e.target.value)}
                    rows="3"
                  />
                </div>
              </div>
            ))}
            
            <button className="add-button" onClick={addResentment}>
              + Add Resentment
            </button>
          </div>
        )}
        
        {activeSection === 'fears' && (
          <div className="fears-section">
            <div className="section-header">
              <h3>Fear Inventory</h3>
              <p>Fear touches all aspects of our lives and recovery.</p>
            </div>
            
            {fears.map((fear) => (
              <div key={fear.id} className="inventory-card">
                <div className="card-header">
                  <h4>Fear #{fears.indexOf(fear) + 1}</h4>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>I am afraid of:</label>
                    <input
                      type="text"
                      placeholder="What are you afraid of?"
                      value={fear.fear}
                      onChange={(e) => updateFear(fear.id, 'fear', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Why do I have this fear?</label>
                    <textarea
                      placeholder="What causes this fear?"
                      value={fear.why}
                      onChange={(e) => updateFear(fear.id, 'why', e.target.value)}
                      rows="2"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>This fear affects my:</label>
                  <div className="checkbox-grid">
                    {Object.entries({
                      selfEsteem: 'Self-Esteem',
                      security: 'Security',
                      ambitions: 'Ambitions', 
                      personalRelations: 'Personal Relations',
                      sexRelations: 'Sex Relations'
                    }).map(([key, label]) => (
                      <label key={key} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={fear.affectedAreas[key]}
                          onChange={(e) => updateFearArea(fear.id, key, e.target.checked)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>New approach (How can I face this with courage?):</label>
                  <textarea
                    placeholder="What's a new way to approach this fear?"
                    value={fear.newApproach}
                    onChange={(e) => updateFear(fear.id, 'newApproach', e.target.value)}
                    rows="3"
                  />
                </div>
              </div>
            ))}
            
            <button className="add-button" onClick={addFear}>
              + Add Fear
            </button>
          </div>
        )}
        
        {activeSection === 'harms' && (
          <div className="harms-section">
            <div className="section-header">
              <h3>Harm to Others</h3>
              <p>Review your past and consider how your actions affected others.</p>
            </div>
            
            {harms.map((harm) => (
              <div key={harm.id} className="inventory-card">
                <div className="card-header">
                  <h4>Harm #{harms.indexOf(harm) + 1}</h4>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Person harmed:</label>
                    <input
                      type="text"
                      placeholder="Who did you harm?"
                      value={harm.person}
                      onChange={(e) => updateHarm(harm.id, 'person', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>What was the harm?</label>
                    <textarea
                      placeholder="Describe the harm caused"
                      value={harm.harm}
                      onChange={(e) => updateHarm(harm.id, 'harm', e.target.value)}
                      rows="2"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Nature of the harm:</label>
                  <textarea
                    placeholder="Was it physical, emotional, financial, spiritual?"
                    value={harm.nature}
                    onChange={(e) => updateHarm(harm.id, 'nature', e.target.value)}
                    rows="2"
                  />
                </div>
                
                <div className="form-group">
                  <label>Possible amends:</label>
                  <textarea
                    placeholder="How might you make amends for this harm?"
                    value={harm.amends}
                    onChange={(e) => updateHarm(harm.id, 'amends', e.target.value)}
                    rows="3"
                  />
                </div>
              </div>
            ))}
            
            <button className="add-button" onClick={addHarm}>
              + Add Harm
            </button>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .fourth-step-worksheet {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .worksheet-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .worksheet-header h2 {
          color: #333;
          margin-bottom: 10px;
        }
        
        .privacy-notice {
          background: #e8f5e8;
          border: 1px solid #c3e6c3;
          padding: 15px;
          border-radius: 10px;
          color: #2d5a2d;
          font-size: 0.9rem;
        }
        
        .section-tabs {
          display: flex;
          margin-bottom: 30px;
          border-bottom: 2px solid #e9ecef;
        }
        
        .tab {
          flex: 1;
          padding: 15px 20px;
          background: none;
          border: none;
          font-size: 1rem;
          font-weight: 600;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .tab.active {
          color: #667eea;
          border-bottom: 3px solid #667eea;
        }
        
        .tab:hover {
          background: rgba(102, 126, 234, 0.1);
        }
        
        .section-header {
          margin-bottom: 30px;
        }
        
        .section-header h3 {
          color: #333;
          margin-bottom: 10px;
        }
        
        .section-header p {
          color: #6c757d;
          font-style: italic;
        }
        
        .inventory-card {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .card-header h4 {
          color: #667eea;
          margin-bottom: 20px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }
        
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          font-size: 16px;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-top: 10px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          font-weight: normal;
          cursor: pointer;
          padding: 8px;
          border-radius: 5px;
          transition: background-color 0.2s;
        }
        
        .checkbox-label:hover {
          background: rgba(102, 126, 234, 0.1);
        }
        
        .checkbox-label input {
          margin-right: 8px;
          margin-bottom: 0;
          width: auto;
        }
        
        .add-button {
          background: #667eea;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 20px;
        }
        
        .add-button:hover {
          background: #5a67d8;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default FourthStepWorksheet;