import React, { useState, useEffect } from 'react'
import type { Meeting } from '@/types'
import meetingNotificationService, { type MeetingReminder, type NotificationPermissionStatus } from '@/services/meetingNotificationService'
import meetingFinderService from '@/services/meetingFinderService'
import './MeetingReminders.css'

interface MeetingRemindersProps {
  isOnline: boolean
}

/**
 * Meeting Reminders Component
 * 
 * Manages meeting notifications, reminders, and scheduling
 * Integrates with browser notifications for timely alerts
 */
export default function MeetingReminders({ isOnline }: MeetingRemindersProps): JSX.Element {
  const [reminders, setReminders] = useState<MeetingReminder[]>([])
  const [favoriteMeetings, setFavoriteMeetings] = useState<Meeting[]>([])
  const [upcomingReminders, setUpcomingReminders] = useState<MeetingReminder[]>([])
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermissionStatus>({
    isSupported: false,
    permission: 'default',
    canRequest: false
  })
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [reminderMinutes, setReminderMinutes] = useState(15)
  const [showCreateReminder, setShowCreateReminder] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    // Update reminders every minute
    const interval = setInterval(loadReminders, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadInitialData = async () => {
    await loadNotificationStatus()
    loadReminders()
    loadFavoriteMeetings()
    loadUpcomingReminders()
  }

  const loadNotificationStatus = async () => {
    const status = await meetingNotificationService.getNotificationStatus()
    setNotificationStatus(status)
  }

  const loadReminders = () => {
    const allReminders = meetingNotificationService.getAllReminders()
    setReminders(allReminders)
  }

  const loadFavoriteMeetings = () => {
    const favorites = meetingFinderService.getFavoriteMeetings()
    setFavoriteMeetings(favorites)
  }

  const loadUpcomingReminders = () => {
    const upcoming = meetingNotificationService.getUpcomingReminders()
    setUpcomingReminders(upcoming)
  }

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true)
    
    try {
      const granted = await meetingNotificationService.requestNotificationPermission()
      if (granted) {
        await loadNotificationStatus()
        alert('✅ Notifications enabled! You\'ll now receive meeting reminders.')
      } else {
        alert('❌ Notification permission denied. You can enable it later in your browser settings.')
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      alert('Failed to enable notifications. Please try again.')
    } finally {
      setIsRequestingPermission(false)
    }
  }

  const handleCreateReminder = async (meeting: Meeting, minutes: number) => {
    try {
      await meetingNotificationService.createReminder(meeting, minutes, true)
      loadReminders()
      loadUpcomingReminders()
      setShowCreateReminder(false)
      setSelectedMeeting(null)
      
      const timeStr = minutes >= 60 ? `${Math.floor(minutes/60)}h ${minutes%60}m` : `${minutes}m`
      alert(`✅ Reminder created: ${meeting.name} - ${timeStr} before meeting`)
    } catch (error) {
      console.error('Failed to create reminder:', error)
      alert('Failed to create reminder. Please try again.')
    }
  }

  const handleQuickReminders = async (meeting: Meeting) => {
    try {
      const reminderIds = await meetingNotificationService.setupQuickReminders(meeting)
      loadReminders()
      loadUpcomingReminders()
      
      alert(`✅ Quick reminders created for ${meeting.name} (15 min & 1 hour before)`)
    } catch (error) {
      console.error('Failed to create quick reminders:', error)
      alert('Failed to create quick reminders. Please try again.')
    }
  }

  const handleToggleReminder = (reminderId: string) => {
    const isEnabled = meetingNotificationService.toggleReminder(reminderId)
    loadReminders()
    loadUpcomingReminders()
    
    const reminder = reminders.find(r => r.id === reminderId)
    if (reminder) {
      alert(`🔔 Reminder ${isEnabled ? 'enabled' : 'disabled'}: ${reminder.meetingName}`)
    }
  }

  const handleDeleteReminder = (reminderId: string) => {
    const reminder = reminders.find(r => r.id === reminderId)
    if (!reminder) return

    if (confirm(`Delete reminder for ${reminder.meetingName}?`)) {
      meetingNotificationService.removeReminder(reminderId)
      loadReminders()
      loadUpcomingReminders()
      alert('🗑️ Reminder deleted')
    }
  }

  const formatReminderTime = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  const formatMeetingTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getNextReminderTime = (reminder: MeetingReminder): Date => {
    const now = new Date()
    if (reminder.isRecurring && reminder.dayOfWeek) {
      // Calculate next weekly occurrence
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const targetDay = daysOfWeek.indexOf(reminder.dayOfWeek)
      const currentDay = now.getDay()
      
      let dayDiff = targetDay - currentDay
      if (dayDiff < 0 || (dayDiff === 0 && reminder.meetingTime <= now)) {
        dayDiff += 7
      }
      
      const nextMeeting = new Date(now)
      nextMeeting.setDate(now.getDate() + dayDiff)
      nextMeeting.setHours(reminder.meetingTime.getHours(), reminder.meetingTime.getMinutes(), 0, 0)
      
      return new Date(nextMeeting.getTime() - reminder.reminderTime * 60 * 1000)
    }
    
    return new Date(reminder.meetingTime.getTime() - reminder.reminderTime * 60 * 1000)
  }

  const stats = meetingNotificationService.getReminderStats()

  return (
    <div className="meeting-reminders" data-testid="meeting-reminders">
      {/* Header */}
      <div className="reminders-header">
        <h1>🔔 Meeting Reminders</h1>
        <p>Never miss an AA meeting with personalized reminders</p>
      </div>

      {/* Notification Permission Status */}
      <div className="notification-status">
        {!notificationStatus.isSupported ? (
          <div className="status-card unsupported">
            <h3>❌ Browser Notifications Not Supported</h3>
            <p>Your browser doesn't support notifications. Reminders will be visible only when the app is open.</p>
          </div>
        ) : notificationStatus.permission === 'granted' ? (
          <div className="status-card enabled">
            <h3>✅ Notifications Enabled</h3>
            <p>You'll receive browser notifications for meeting reminders.</p>
          </div>
        ) : notificationStatus.permission === 'denied' ? (
          <div className="status-card denied">
            <h3>❌ Notifications Blocked</h3>
            <p>Please enable notifications in your browser settings to receive reminders.</p>
            <button 
              onClick={() => window.location.reload()}
              className="retry-permission-button"
            >
              🔄 Check Again
            </button>
          </div>
        ) : (
          <div className="status-card request">
            <h3>🔔 Enable Notifications</h3>
            <p>Allow notifications to receive timely meeting reminders even when this app isn't open.</p>
            <button
              onClick={handleRequestPermission}
              disabled={isRequestingPermission}
              className="enable-notifications-button"
            >
              {isRequestingPermission ? '⏳ Requesting...' : '✅ Enable Notifications'}
            </button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="reminder-stats">
        <div className="stat-card">
          <span className="stat-number">{stats.activeReminders}</span>
          <span className="stat-label">Active Reminders</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.upcomingCount}</span>
          <span className="stat-label">Next 24 Hours</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.averageReminderTime}m</span>
          <span className="stat-label">Avg Reminder Time</span>
        </div>
      </div>

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <div className="upcoming-reminders">
          <h2>⏰ Next 24 Hours</h2>
          <div className="upcoming-grid">
            {upcomingReminders.slice(0, 6).map((reminder) => {
              const nextReminderTime = getNextReminderTime(reminder)
              const timeUntilReminder = nextReminderTime.getTime() - Date.now()
              const hoursUntil = Math.floor(timeUntilReminder / (1000 * 60 * 60))
              const minutesUntil = Math.floor((timeUntilReminder % (1000 * 60 * 60)) / (1000 * 60))
              
              return (
                <div key={reminder.id} className="upcoming-reminder-card">
                  <h4>{reminder.meetingName}</h4>
                  <div className="reminder-time">
                    <span className="time-until">
                      {hoursUntil > 0 ? `${hoursUntil}h ${minutesUntil}m` : `${minutesUntil}m`}
                    </span>
                    <span className="reminder-detail">
                      {formatReminderTime(reminder.reminderTime)} before meeting
                    </span>
                  </div>
                  <div className="meeting-time">
                    Meeting: {formatMeetingTime(reminder.meetingTime)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Reminders for Favorites */}
      {favoriteMeetings.length > 0 && (
        <div className="create-reminders">
          <h2>⭐ Set Reminders for Favorites</h2>
          <div className="favorites-grid">
            {favoriteMeetings.map((meeting) => {
              const existingReminders = meetingNotificationService.getRemindersForMeeting(meeting.id)
              
              return (
                <div key={meeting.id} className="favorite-meeting-card">
                  <div className="meeting-info">
                    <h4>{meeting.name}</h4>
                    <p>{meeting.day} • {meeting.time}</p>
                    {meeting.isVirtual ? (
                      <span className="meeting-type virtual">🌐 Virtual</span>
                    ) : (
                      <span className="meeting-type in-person">📍 In-Person</span>
                    )}
                  </div>
                  
                  <div className="reminder-actions">
                    {existingReminders.length === 0 ? (
                      <div className="no-reminders">
                        <p>No reminders set</p>
                        <button
                          onClick={() => handleQuickReminders(meeting)}
                          className="quick-setup-button"
                        >
                          ⚡ Quick Setup
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMeeting(meeting)
                            setShowCreateReminder(true)
                          }}
                          className="custom-reminder-button"
                        >
                          ➕ Custom
                        </button>
                      </div>
                    ) : (
                      <div className="existing-reminders">
                        <p>{existingReminders.length} reminder{existingReminders.length > 1 ? 's' : ''} set</p>
                        <button
                          onClick={() => {
                            setSelectedMeeting(meeting)
                            setShowCreateReminder(true)
                          }}
                          className="add-reminder-button"
                        >
                          ➕ Add Another
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* All Reminders */}
      <div className="all-reminders">
        <h2>📋 All Reminders ({reminders.length})</h2>
        {reminders.length === 0 ? (
          <div className="no-reminders-message">
            <p>No reminders set yet.</p>
            <p>Add meetings to your favorites and set up reminders to never miss a meeting!</p>
          </div>
        ) : (
          <div className="reminders-list">
            {reminders.map((reminder) => (
              <div key={reminder.id} className={`reminder-item ${reminder.isEnabled ? 'enabled' : 'disabled'}`}>
                <div className="reminder-info">
                  <h4>{reminder.meetingName}</h4>
                  <div className="reminder-details">
                    <span className="reminder-time">
                      🕒 {formatReminderTime(reminder.reminderTime)} before
                    </span>
                    <span className="meeting-time">
                      📅 {formatMeetingTime(reminder.meetingTime)}
                    </span>
                    {reminder.isRecurring && (
                      <span className="recurring-badge">🔄 Weekly</span>
                    )}
                  </div>
                </div>
                
                <div className="reminder-controls">
                  <button
                    onClick={() => handleToggleReminder(reminder.id)}
                    className={`toggle-button ${reminder.isEnabled ? 'enabled' : 'disabled'}`}
                    title={reminder.isEnabled ? 'Disable reminder' : 'Enable reminder'}
                  >
                    {reminder.isEnabled ? '🔔' : '🔕'}
                  </button>
                  <button
                    onClick={() => handleDeleteReminder(reminder.id)}
                    className="delete-button"
                    title="Delete reminder"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Reminder Modal */}
      {showCreateReminder && selectedMeeting && (
        <div className="modal-overlay" onClick={() => setShowCreateReminder(false)}>
          <div className="reminder-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Reminder</h3>
              <button
                onClick={() => setShowCreateReminder(false)}
                className="close-modal-button"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="meeting-summary">
                <h4>{selectedMeeting.name}</h4>
                <p>{selectedMeeting.day} • {selectedMeeting.time}</p>
              </div>
              
              <div className="reminder-form">
                <label htmlFor="reminder-time">Remind me:</label>
                <select
                  id="reminder-time"
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="reminder-time-select"
                >
                  <option value={5}>5 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={120}>2 hours before</option>
                  <option value={240}>4 hours before</option>
                  <option value={480}>8 hours before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                onClick={() => handleCreateReminder(selectedMeeting, reminderMinutes)}
                className="create-reminder-button"
              >
                ✅ Create Reminder
              </button>
              <button
                onClick={() => setShowCreateReminder(false)}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="privacy-notice">
        <h3>🔒 Your Privacy</h3>
        <ul>
          <li><strong>Local Storage Only:</strong> All reminders are stored locally on your device</li>
          <li><strong>No Personal Data:</strong> We don't collect or store personal information</li>
          <li><strong>AA Anonymity:</strong> Complete privacy maintained per AA Tradition 12</li>
          <li><strong>Browser Only:</strong> Notifications use your browser's secure notification system</li>
        </ul>
      </div>
    </div>
  )
}