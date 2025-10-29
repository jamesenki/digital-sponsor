import React, { useState, useEffect } from 'react'
import type { Session } from '@/types'
import recoveryDashboardService, {
  type SobrietyData,
  type DailyCheckIn,
  type RecoveryGoal,
  type DashboardStats,
  type RecoveryAnalytics,
  type Milestone
} from '@/services/recoveryDashboardService'
import './RecoveryDashboard.css'

interface RecoveryDashboardProps {
  isOnline: boolean
  session: Session | null
}

/**
 * Recovery Dashboard Component
 * 
 * Comprehensive recovery tracking with sobriety counter, daily check-ins,
 * goals, and analytics - all while maintaining complete anonymity
 */
export default function RecoveryDashboard({ isOnline, session }: RecoveryDashboardProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'checkin' | 'goals' | 'analytics'>('overview')
  const [sobrietyData, setSobrietyData] = useState<SobrietyData | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckIn | null>(null)
  const [recentCheckIns, setRecentCheckIns] = useState<DailyCheckIn[]>([])
  const [recoveryGoals, setRecoveryGoals] = useState<RecoveryGoal[]>([])
  const [analytics, setAnalytics] = useState<RecoveryAnalytics | null>(null)
  const [showSobrietySetup, setShowSobrietySetup] = useState(false)
  const [showCheckInForm, setShowCheckInForm] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [newSobrietyDate, setNewSobrietyDate] = useState('')
  const [checkInForm, setCheckInForm] = useState({
    mood: 3 as 1 | 2 | 3 | 4 | 5,
    gratitude: [''],
    challenges: [''],
    wins: [''],
    stepsWorked: [] as number[],
    meetingsAttended: 0,
    litteratureRead: false,
    prayerMeditation: false,
    sponsorContact: false,
    serviceWork: false,
    notes: '',
    cravings: 0 as 0 | 1 | 2 | 3 | 4 | 5,
    stress: 0 as 0 | 1 | 2 | 3 | 4 | 5,
    sleep: 'good' as 'poor' | 'fair' | 'good' | 'excellent',
    tags: []
  })
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    category: 'spiritual' as 'spiritual' | 'service' | 'personal' | 'relationships' | 'health' | 'literature',
    priority: 'medium' as 'low' | 'medium' | 'high',
    targetDate: '',
    tags: []
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = () => {
    try {
      // Load sobriety data
      const sober = recoveryDashboardService.getSobrietyData()
      setSobrietyData(sober)

      // Load dashboard stats
      const stats = recoveryDashboardService.getDashboardStats()
      setDashboardStats(stats)

      // Load today's check-in
      const today = new Date().toISOString().split('T')[0]
      const todayCheck = recoveryDashboardService.getCheckInForDate(today)
      setTodayCheckIn(todayCheck)

      // Load recent check-ins
      const recent = recoveryDashboardService.getDailyCheckIns(7)
      setRecentCheckIns(recent)

      // Load recovery goals
      const goals = recoveryDashboardService.getRecoveryGoals()
      setRecoveryGoals(goals)

      // Load analytics
      const analyticsData = recoveryDashboardService.getRecoveryAnalytics()
      setAnalytics(analyticsData)

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const handleSetSobrietyDate = () => {
    if (!newSobrietyDate) return

    const date = new Date(newSobrietyDate)
    recoveryDashboardService.setSobrietyStartDate(date)
    setShowSobrietySetup(false)
    setNewSobrietyDate('')
    loadDashboardData()
  }

  const handleSubmitCheckIn = () => {
    const today = new Date().toISOString().split('T')[0]
    
    const checkIn = {
      date: today,
      ...checkInForm,
      gratitude: checkInForm.gratitude.filter(g => g.trim()),
      challenges: checkInForm.challenges.filter(c => c.trim()),
      wins: checkInForm.wins.filter(w => w.trim())
    }

    recoveryDashboardService.addDailyCheckIn(checkIn)
    setShowCheckInForm(false)
    
    // Reset form
    setCheckInForm({
      mood: 3,
      gratitude: [''],
      challenges: [''],
      wins: [''],
      stepsWorked: [],
      meetingsAttended: 0,
      litteratureRead: false,
      prayerMeditation: false,
      sponsorContact: false,
      serviceWork: false,
      notes: '',
      cravings: 0,
      stress: 0,
      sleep: 'good',
      tags: []
    })
    
    loadDashboardData()
  }

  const handleCreateGoal = () => {
    if (!goalForm.title.trim()) return

    const goal = {
      ...goalForm,
      status: 'active' as const,
      targetDate: goalForm.targetDate ? new Date(goalForm.targetDate) : undefined
    }

    recoveryDashboardService.createRecoveryGoal(goal)
    setShowGoalForm(false)
    
    // Reset form
    setGoalForm({
      title: '',
      description: '',
      category: 'spiritual',
      priority: 'medium',
      targetDate: '',
      tags: []
    })
    
    loadDashboardData()
  }

  const updateArrayField = (
    field: 'gratitude' | 'challenges' | 'wins',
    index: number,
    value: string
  ) => {
    setCheckInForm(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const addArrayField = (field: 'gratitude' | 'challenges' | 'wins') => {
    setCheckInForm(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const removeArrayField = (field: 'gratitude' | 'challenges' | 'wins', index: number) => {
    if (checkInForm[field].length > 1) {
      setCheckInForm(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }))
    }
  }

  const getMoodEmoji = (mood: number): string => {
    const emojis = { 1: '😢', 2: '😕', 3: '😐', 4: '😊', 5: '😄' }
    return emojis[mood as keyof typeof emojis] || '😐'
  }

  const getMoodLabel = (mood: number): string => {
    const labels = { 1: 'Struggling', 2: 'Difficult', 3: 'Okay', 4: 'Good', 5: 'Excellent' }
    return labels[mood as keyof typeof labels] || 'Okay'
  }

  const formatDaysToMilestone = (days: number): string => {
    if (days === 0) return 'Achieved!'
    if (days === 1) return '1 day to go'
    return `${days} days to go`
  }

  const renderMilestoneProgress = (milestone: Milestone | null, daysToGo: number) => {
    if (!milestone) return null

    const progress = Math.max(0, Math.min(100, ((milestone.days - daysToGo) / milestone.days) * 100))

    return (
      <div className="milestone-progress">
        <div className="milestone-header">
          <span className="milestone-icon">{milestone.icon}</span>
          <div className="milestone-info">
            <h4>{milestone.title}</h4>
            <p>{formatDaysToMilestone(daysToGo)}</p>
          </div>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="progress-text">{Math.round(progress)}% complete</span>
      </div>
    )
  }

  if (!sobrietyData || !dashboardStats) {
    return (
      <div className="recovery-dashboard loading">
        <div className="loading-spinner">Loading your recovery dashboard...</div>
      </div>
    )
  }

  return (
    <div className="recovery-dashboard" data-testid="recovery-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>🎯 Recovery Dashboard</h1>
        <p>Track your journey, celebrate progress, stay connected to recovery</p>
      </div>

      {/* Sobriety Counter - Always Visible */}
      <div className="sobriety-counter">
        <div className="counter-main">
          <div className="days-sober">
            <span className="number">{sobrietyData.totalDays}</span>
            <span className="label">Days Sober</span>
          </div>
          <div className="sobriety-date">
            <span className="label">Since:</span>
            <span className="date">{sobrietyData.startDate.toLocaleDateString()}</span>
          </div>
        </div>
        
        {!sobrietyData.isActive && (
          <div className="setup-sobriety">
            <p>Set your sobriety date to start tracking your recovery journey</p>
            <button onClick={() => setShowSobrietySetup(true)} className="setup-button">
              📅 Set Sobriety Date
            </button>
          </div>
        )}
        
        {sobrietyData.isActive && dashboardStats.sobriety.nextMilestone && (
          renderMilestoneProgress(dashboardStats.sobriety.nextMilestone, dashboardStats.sobriety.daysToMilestone)
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          onClick={() => setShowCheckInForm(true)}
          className={`quick-action ${todayCheckIn ? 'completed' : 'pending'}`}
          disabled={!!todayCheckIn}
        >
          <span className="action-icon">📝</span>
          <span className="action-text">
            {todayCheckIn ? 'Checked In Today' : 'Daily Check-In'}
          </span>
        </button>
        
        <button onClick={() => setActiveTab('goals')} className="quick-action">
          <span className="action-icon">🎯</span>
          <span className="action-text">View Goals</span>
        </button>
        
        <button onClick={() => setActiveTab('analytics')} className="quick-action">
          <span className="action-icon">📊</span>
          <span className="action-text">Analytics</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          onClick={() => setActiveTab('overview')}
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
        >
          🏠 Overview
        </button>
        <button
          onClick={() => setActiveTab('checkin')}
          className={`tab-button ${activeTab === 'checkin' ? 'active' : ''}`}
        >
          📝 Check-Ins
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`tab-button ${activeTab === 'goals' ? 'active' : ''}`}
        >
          🎯 Goals ({dashboardStats.goals.active})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
        >
          📊 Analytics
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="overview-content">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">🔥</span>
              <span className="stat-number">{dashboardStats.checkIns.streak}</span>
              <span className="stat-label">Check-In Streak</span>
            </div>
            
            <div className="stat-card">
              <span className="stat-icon">🏛️</span>
              <span className="stat-number">{dashboardStats.engagement.meetingsThisWeek}</span>
              <span className="stat-label">Meetings This Week</span>
            </div>
            
            <div className="stat-card">
              <span className="stat-icon">✅</span>
              <span className="stat-number">{dashboardStats.goals.completed}</span>
              <span className="stat-label">Goals Completed</span>
            </div>
            
            <div className="stat-card">
              <span className="stat-icon">📚</span>
              <span className="stat-number">{dashboardStats.engagement.literaturePages}</span>
              <span className="stat-label">Literature Days</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="recent-activity">
            <h3>📈 Recent Activity</h3>
            {recentCheckIns.length > 0 ? (
              <div className="activity-list">
                {recentCheckIns.slice(0, 5).map(checkIn => (
                  <div key={checkIn.id} className="activity-item">
                    <div className="activity-date">{new Date(checkIn.date).toLocaleDateString()}</div>
                    <div className="activity-mood">
                      <span className="mood-emoji">{getMoodEmoji(checkIn.mood)}</span>
                      <span className="mood-label">{getMoodLabel(checkIn.mood)}</span>
                    </div>
                    <div className="activity-highlights">
                      {checkIn.meetingsAttended > 0 && <span className="highlight">🏛️ {checkIn.meetingsAttended} meetings</span>}
                      {checkIn.litteratureRead && <span className="highlight">📚 Literature</span>}
                      {checkIn.serviceWork && <span className="highlight">🤝 Service</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-activity">
                <p>No check-ins yet. Start with your first daily check-in!</p>
              </div>
            )}
          </div>

          {/* Active Goals Preview */}
          <div className="goals-preview">
            <h3>🎯 Active Goals</h3>
            {recoveryGoals.filter(g => g.status === 'active').slice(0, 3).map(goal => (
              <div key={goal.id} className="goal-preview-item">
                <div className="goal-info">
                  <h4>{goal.title}</h4>
                  <p>{goal.description}</p>
                </div>
                <div className="goal-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{goal.progress}%</span>
                </div>
              </div>
            ))}
            {recoveryGoals.filter(g => g.status === 'active').length === 0 && (
              <div className="no-goals">
                <p>No active goals. Set some recovery goals to focus your efforts!</p>
                <button onClick={() => setShowGoalForm(true)} className="create-goal-button">
                  ➕ Create Goal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'checkin' && (
        <div className="checkin-content">
          <div className="checkin-header">
            <h3>📝 Daily Check-Ins</h3>
            {!todayCheckIn && (
              <button 
                onClick={() => setShowCheckInForm(true)} 
                className="checkin-button"
              >
                ➕ Today's Check-In
              </button>
            )}
          </div>

          {todayCheckIn && (
            <div className="today-checkin">
              <h4>✅ Today's Check-In Complete</h4>
              <div className="checkin-summary">
                <span className="mood-display">
                  {getMoodEmoji(todayCheckIn.mood)} {getMoodLabel(todayCheckIn.mood)}
                </span>
                <div className="checkin-highlights">
                  {todayCheckIn.meetingsAttended > 0 && 
                    <span className="highlight">🏛️ {todayCheckIn.meetingsAttended} meetings</span>}
                  {todayCheckIn.litteratureRead && <span className="highlight">📚 Literature</span>}
                  {todayCheckIn.sponsorContact && <span className="highlight">📞 Sponsor</span>}
                  {todayCheckIn.serviceWork && <span className="highlight">🤝 Service</span>}
                </div>
              </div>
            </div>
          )}

          <div className="checkin-history">
            <h4>📊 Check-In History</h4>
            <div className="checkin-grid">
              {recentCheckIns.map(checkIn => (
                <div key={checkIn.id} className="checkin-card">
                  <div className="checkin-date">{new Date(checkIn.date).toLocaleDateString()}</div>
                  <div className="checkin-mood">
                    <span className="mood-emoji">{getMoodEmoji(checkIn.mood)}</span>
                    <span className="mood-label">{getMoodLabel(checkIn.mood)}</span>
                  </div>
                  {checkIn.gratitude.length > 0 && (
                    <div className="checkin-section">
                      <strong>Gratitude:</strong>
                      <ul>
                        {checkIn.gratitude.slice(0, 2).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="checkin-activities">
                    {checkIn.meetingsAttended > 0 && <span className="activity">🏛️ {checkIn.meetingsAttended}</span>}
                    {checkIn.litteratureRead && <span className="activity">📚</span>}
                    {checkIn.sponsorContact && <span className="activity">📞</span>}
                    {checkIn.serviceWork && <span className="activity">🤝</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="goals-content">
          <div className="goals-header">
            <h3>🎯 Recovery Goals</h3>
            <button onClick={() => setShowGoalForm(true)} className="create-goal-button">
              ➕ New Goal
            </button>
          </div>

          <div className="goals-grid">
            {recoveryGoals.map(goal => (
              <div key={goal.id} className={`goal-card ${goal.status}`}>
                <div className="goal-header">
                  <h4>{goal.title}</h4>
                  <span className={`goal-priority priority-${goal.priority}`}>
                    {goal.priority}
                  </span>
                </div>
                <p className="goal-description">{goal.description}</p>
                <div className="goal-meta">
                  <span className="goal-category">{goal.category}</span>
                  {goal.targetDate && (
                    <span className="goal-target">
                      Target: {goal.targetDate.toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="goal-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{goal.progress}% complete</span>
                </div>
                <div className="goal-actions">
                  <button 
                    onClick={() => recoveryDashboardService.updateGoalProgress(goal.id, goal.progress + 10)}
                    className="progress-button"
                    disabled={goal.status !== 'active'}
                  >
                    ➕ Update Progress
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="analytics-content">
          <h3>📊 Recovery Analytics</h3>
          
          <div className="analytics-overview">
            <div className="overview-card">
              <h4>📈 Overview</h4>
              <div className="overview-stats">
                <div className="overview-stat">
                  <span className="stat-label">Average Mood:</span>
                  <span className="stat-value">{analytics.overview.averageMood.toFixed(1)}/5</span>
                </div>
                <div className="overview-stat">
                  <span className="stat-label">Check-In Streak:</span>
                  <span className="stat-value">{analytics.overview.checkInStreak} days</span>
                </div>
                <div className="overview-stat">
                  <span className="stat-label">Meeting Attendance:</span>
                  <span className="stat-value">{analytics.trends.meetingAttendance}/week</span>
                </div>
              </div>
            </div>

            <div className="trends-card">
              <h4>📊 Trends</h4>
              <div className="trend-item">
                <span>Mood:</span>
                <span className={`trend trend-${analytics.trends.moodTrend}`}>
                  {analytics.trends.moodTrend}
                </span>
              </div>
              <div className="trend-item">
                <span>Cravings:</span>
                <span className={`trend trend-${analytics.trends.cravingsTrend}`}>
                  {analytics.trends.cravingsTrend}
                </span>
              </div>
              <div className="trend-item">
                <span>Stress:</span>
                <span className={`trend trend-${analytics.trends.stressTrend}`}>
                  {analytics.trends.stressTrend}
                </span>
              </div>
            </div>
          </div>

          {analytics.insights.length > 0 && (
            <div className="insights-section">
              <h4>💡 Insights</h4>
              <div className="insights-grid">
                {analytics.insights.map(insight => (
                  <div key={insight.id} className={`insight-card insight-${insight.type}`}>
                    <h5>{insight.title}</h5>
                    <p>{insight.description}</p>
                    {insight.actionItems.length > 0 && (
                      <div className="action-items">
                        <strong>Action Items:</strong>
                        <ul>
                          {insight.actionItems.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.recommendations.length > 0 && (
            <div className="recommendations-section">
              <h4>🎯 Recommendations</h4>
              <ul className="recommendations-list">
                {analytics.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      
      {/* Sobriety Setup Modal */}
      {showSobrietySetup && (
        <div className="modal-overlay" onClick={() => setShowSobrietySetup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Set Your Sobriety Date</h3>
              <button onClick={() => setShowSobrietySetup(false)} className="close-button">✕</button>
            </div>
            <div className="modal-content">
              <p>When did your current period of sobriety begin?</p>
              <input
                type="date"
                value={newSobrietyDate}
                onChange={(e) => setNewSobrietyDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="date-input"
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleSetSobrietyDate} className="primary-button">
                ✅ Set Date
              </button>
              <button onClick={() => setShowSobrietySetup(false)} className="secondary-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-In Modal */}
      {showCheckInForm && (
        <div className="modal-overlay" onClick={() => setShowCheckInForm(false)}>
          <div className="modal large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📝 Daily Check-In</h3>
              <button onClick={() => setShowCheckInForm(false)} className="close-button">✕</button>
            </div>
            <div className="modal-content checkin-form">
              {/* Mood */}
              <div className="form-section">
                <label>How are you feeling today?</label>
                <div className="mood-selector">
                  {[1, 2, 3, 4, 5].map(mood => (
                    <button
                      key={mood}
                      onClick={() => setCheckInForm(prev => ({ ...prev, mood: mood as any }))}
                      className={`mood-button ${checkInForm.mood === mood ? 'selected' : ''}`}
                    >
                      <span className="mood-emoji">{getMoodEmoji(mood)}</span>
                      <span className="mood-label">{getMoodLabel(mood)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gratitude */}
              <div className="form-section">
                <label>What are you grateful for today?</label>
                {checkInForm.gratitude.map((item, index) => (
                  <div key={index} className="array-input">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateArrayField('gratitude', index, e.target.value)}
                      placeholder="Something you're grateful for..."
                    />
                    {checkInForm.gratitude.length > 1 && (
                      <button 
                        onClick={() => removeArrayField('gratitude', index)}
                        className="remove-button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => addArrayField('gratitude')} className="add-button">
                  ➕ Add Another
                </button>
              </div>

              {/* Activities */}
              <div className="form-section">
                <label>Recovery Activities Today</label>
                <div className="activities-grid">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={checkInForm.litteratureRead}
                      onChange={(e) => setCheckInForm(prev => ({ ...prev, litteratureRead: e.target.checked }))}
                    />
                    📚 Read Literature
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={checkInForm.prayerMeditation}
                      onChange={(e) => setCheckInForm(prev => ({ ...prev, prayerMeditation: e.target.checked }))}
                    />
                    🙏 Prayer/Meditation
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={checkInForm.sponsorContact}
                      onChange={(e) => setCheckInForm(prev => ({ ...prev, sponsorContact: e.target.checked }))}
                    />
                    📞 Contacted Sponsor
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={checkInForm.serviceWork}
                      onChange={(e) => setCheckInForm(prev => ({ ...prev, serviceWork: e.target.checked }))}
                    />
                    🤝 Service Work
                  </label>
                </div>
              </div>

              {/* Meetings */}
              <div className="form-section">
                <label>Meetings Attended Today</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={checkInForm.meetingsAttended}
                  onChange={(e) => setCheckInForm(prev => ({ ...prev, meetingsAttended: parseInt(e.target.value) || 0 }))}
                />
              </div>

              {/* Notes */}
              <div className="form-section">
                <label>Additional Notes</label>
                <textarea
                  value={checkInForm.notes}
                  onChange={(e) => setCheckInForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="How was your day? Any insights or reflections?"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleSubmitCheckIn} className="primary-button">
                ✅ Submit Check-In
              </button>
              <button onClick={() => setShowCheckInForm(false)} className="secondary-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Creation Modal */}
      {showGoalForm && (
        <div className="modal-overlay" onClick={() => setShowGoalForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎯 Create Recovery Goal</h3>
              <button onClick={() => setShowGoalForm(false)} className="close-button">✕</button>
            </div>
            <div className="modal-content goal-form">
              <div className="form-section">
                <label>Goal Title</label>
                <input
                  type="text"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What do you want to achieve?"
                />
              </div>
              
              <div className="form-section">
                <label>Description</label>
                <textarea
                  value={goalForm.description}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your goal in detail..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-section">
                  <label>Category</label>
                  <select
                    value={goalForm.category}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, category: e.target.value as any }))}
                  >
                    <option value="spiritual">Spiritual</option>
                    <option value="service">Service</option>
                    <option value="personal">Personal</option>
                    <option value="relationships">Relationships</option>
                    <option value="health">Health</option>
                    <option value="literature">Literature</option>
                  </select>
                </div>

                <div className="form-section">
                  <label>Priority</label>
                  <select
                    value={goalForm.priority}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, priority: e.target.value as any }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <label>Target Date (Optional)</label>
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, targetDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleCreateGoal} className="primary-button">
                ✅ Create Goal
              </button>
              <button onClick={() => setShowGoalForm(false)} className="secondary-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="privacy-notice">
        <h4>🔒 Your Privacy</h4>
        <p>All recovery data is stored locally on your device. Nothing is shared or transmitted to external servers. Your recovery journey remains completely private and anonymous.</p>
      </div>
    </div>
  )
}