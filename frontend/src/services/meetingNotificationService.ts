/**
 * Meeting Notification Service
 * 
 * Handles meeting reminders, browser notifications, and scheduling
 * Integrates with the Meeting Finder to provide timely alerts
 * Maintains AA anonymity and privacy standards
 */

import type { Meeting } from '@/types'

export interface MeetingReminder {
  id: string
  meetingId: string
  meetingName: string
  meetingTime: Date
  reminderTime: number // minutes before meeting
  isEnabled: boolean
  notificationMethod: 'browser' | 'none'
  isRecurring: boolean
  dayOfWeek?: string // for recurring weekly meetings
  createdAt: Date
}

export interface NotificationPermissionStatus {
  isSupported: boolean
  permission: NotificationPermission
  canRequest: boolean
}

export class MeetingNotificationService {
  private reminders: Map<string, MeetingReminder> = new Map()
  private notificationTimeouts: Map<string, number> = new Map()
  private readonly STORAGE_KEY = 'aa_meeting_reminders'
  private readonly DEFAULT_REMINDER_TIMES = [15, 30, 60, 120] // minutes before meeting

  constructor() {
    this.loadReminders()
    this.scheduleActiveReminders()
    
    // Listen for page visibility changes to reschedule reminders
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.scheduleActiveReminders()
      }
    })
  }

  /**
   * Check browser notification support and permissions
   */
  async getNotificationStatus(): Promise<NotificationPermissionStatus> {
    const isSupported = 'Notification' in window
    
    if (!isSupported) {
      return {
        isSupported: false,
        permission: 'denied',
        canRequest: false
      }
    }

    return {
      isSupported: true,
      permission: Notification.permission,
      canRequest: Notification.permission === 'default'
    }
  }

  /**
   * Request notification permission from user
   */
  async requestNotificationPermission(): Promise<boolean> {
    const status = await this.getNotificationStatus()
    
    if (!status.isSupported) {
      console.log('Browser notifications not supported')
      return false
    }

    if (status.permission === 'granted') {
      return true
    }

    if (status.permission === 'denied') {
      console.log('Notification permission denied')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }

  /**
   * Create a reminder for a meeting
   */
  async createReminder(
    meeting: Meeting, 
    reminderMinutes: number,
    isRecurring: boolean = true
  ): Promise<string> {
    const reminderId = `reminder_${meeting.id}_${reminderMinutes}`
    
    // Parse meeting time
    const meetingTime = this.parseMeetingTime(meeting.day, meeting.time)
    
    const reminder: MeetingReminder = {
      id: reminderId,
      meetingId: meeting.id,
      meetingName: meeting.name,
      meetingTime,
      reminderTime: reminderMinutes,
      isEnabled: true,
      notificationMethod: 'browser',
      isRecurring,
      dayOfWeek: isRecurring ? meeting.day : undefined,
      createdAt: new Date()
    }

    this.reminders.set(reminderId, reminder)
    this.saveReminders()
    this.scheduleReminder(reminder)
    
    console.log(`✅ Reminder created: ${meeting.name} - ${reminderMinutes} minutes before`)
    return reminderId
  }

  /**
   * Remove a reminder
   */
  removeReminder(reminderId: string): void {
    const reminder = this.reminders.get(reminderId)
    if (!reminder) return

    // Clear any scheduled notification
    const timeoutId = this.notificationTimeouts.get(reminderId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.notificationTimeouts.delete(reminderId)
    }

    this.reminders.delete(reminderId)
    this.saveReminders()
    
    console.log(`🗑️ Reminder removed: ${reminder.meetingName}`)
  }

  /**
   * Get all reminders for a meeting
   */
  getRemindersForMeeting(meetingId: string): MeetingReminder[] {
    return Array.from(this.reminders.values())
      .filter(reminder => reminder.meetingId === meetingId)
      .sort((a, b) => a.reminderTime - b.reminderTime)
  }

  /**
   * Get all active reminders
   */
  getAllReminders(): MeetingReminder[] {
    return Array.from(this.reminders.values())
      .filter(reminder => reminder.isEnabled)
      .sort((a, b) => a.meetingTime.getTime() - b.meetingTime.getTime())
  }

  /**
   * Toggle reminder on/off
   */
  toggleReminder(reminderId: string): boolean {
    const reminder = this.reminders.get(reminderId)
    if (!reminder) return false

    reminder.isEnabled = !reminder.isEnabled
    this.saveReminders()

    if (reminder.isEnabled) {
      this.scheduleReminder(reminder)
    } else {
      const timeoutId = this.notificationTimeouts.get(reminderId)
      if (timeoutId) {
        clearTimeout(timeoutId)
        this.notificationTimeouts.delete(reminderId)
      }
    }

    console.log(`🔔 Reminder ${reminder.isEnabled ? 'enabled' : 'disabled'}: ${reminder.meetingName}`)
    return reminder.isEnabled
  }

  /**
   * Set up quick reminders for a favorite meeting
   */
  async setupQuickReminders(meeting: Meeting): Promise<string[]> {
    const reminderIds: string[] = []

    // Create reminders at 15 and 60 minutes before
    for (const minutes of [15, 60]) {
      try {
        const reminderId = await this.createReminder(meeting, minutes, true)
        reminderIds.push(reminderId)
      } catch (error) {
        console.error(`Failed to create ${minutes}-minute reminder:`, error)
      }
    }

    return reminderIds
  }

  /**
   * Get upcoming reminders (next 24 hours)
   */
  getUpcomingReminders(): MeetingReminder[] {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    return this.getAllReminders().filter(reminder => {
      const reminderTime = new Date(reminder.meetingTime.getTime() - reminder.reminderTime * 60 * 1000)
      return reminderTime >= now && reminderTime <= tomorrow
    })
  }

  /**
   * Schedule all active reminders
   */
  private scheduleActiveReminders(): void {
    // Clear existing timeouts
    this.notificationTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
    this.notificationTimeouts.clear()

    // Schedule all active reminders
    const activeReminders = this.getAllReminders()
    activeReminders.forEach(reminder => this.scheduleReminder(reminder))

    console.log(`📅 Scheduled ${activeReminders.length} meeting reminders`)
  }

  /**
   * Schedule a specific reminder
   */
  private scheduleReminder(reminder: MeetingReminder): void {
    const now = new Date()
    let nextReminderTime: Date

    if (reminder.isRecurring && reminder.dayOfWeek) {
      // For recurring reminders, find the next occurrence
      nextReminderTime = this.getNextWeeklyOccurrence(reminder.dayOfWeek, reminder.meetingTime)
    } else {
      // For one-time reminders, use the exact meeting time
      nextReminderTime = new Date(reminder.meetingTime)
    }

    // Calculate when to show the reminder
    const reminderTriggerTime = new Date(nextReminderTime.getTime() - reminder.reminderTime * 60 * 1000)
    
    // Don't schedule if reminder time has already passed
    if (reminderTriggerTime <= now) {
      if (reminder.isRecurring) {
        // For recurring reminders, schedule for next week
        const nextWeek = new Date(nextReminderTime.getTime() + 7 * 24 * 60 * 60 * 1000)
        const nextWeekReminderTime = new Date(nextWeek.getTime() - reminder.reminderTime * 60 * 1000)
        
        if (nextWeekReminderTime > now) {
          this.scheduleNotification(reminder, nextWeekReminderTime)
        }
      }
      return
    }

    this.scheduleNotification(reminder, reminderTriggerTime)
  }

  /**
   * Schedule the actual notification
   */
  private scheduleNotification(reminder: MeetingReminder, triggerTime: Date): void {
    const now = new Date()
    const delay = triggerTime.getTime() - now.getTime()

    // Don't schedule if delay is more than 7 days (browser timeout limits)
    if (delay > 7 * 24 * 60 * 60 * 1000) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      this.showNotification(reminder)
      this.notificationTimeouts.delete(reminder.id)
      
      // If recurring, schedule the next occurrence
      if (reminder.isRecurring) {
        this.scheduleReminder(reminder)
      }
    }, delay)

    this.notificationTimeouts.set(reminder.id, timeoutId)
    
    console.log(`⏰ Reminder scheduled: ${reminder.meetingName} in ${Math.round(delay / 60000)} minutes`)
  }

  /**
   * Show the notification
   */
  private async showNotification(reminder: MeetingReminder): Promise<void> {
    const status = await this.getNotificationStatus()
    
    if (!status.isSupported || status.permission !== 'granted') {
      console.log('Cannot show notification - permission not granted')
      return
    }

    try {
      const timeUntilMeeting = reminder.reminderTime
      const meetingTimeStr = reminder.meetingTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })

      const notification = new Notification(`🏛️ AA Meeting Reminder`, {
        body: `${reminder.meetingName} starts in ${timeUntilMeeting} minutes (${meetingTimeStr})`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: `meeting-reminder-${reminder.meetingId}`,
        requireInteraction: true
      })

      // Auto-close after 30 seconds if not interacted with
      setTimeout(() => {
        notification.close()
      }, 30000)

      // Handle notification clicks
      notification.onclick = () => {
        window.focus()
        // Navigate to meetings page
        window.location.hash = '#/meetings'
        notification.close()
      }

      console.log(`🔔 Notification shown: ${reminder.meetingName}`)
      this.logNotificationShown(reminder)

    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }

  /**
   * Parse meeting day and time to Date object
   */
  private parseMeetingTime(day: string, time: string): Date {
    const now = new Date()
    const meetingDate = new Date(now)
    
    // Parse time
    const [timeStr, period] = time.split(' ')
    const [hours, minutes] = timeStr.split(':').map(Number)
    
    let hour24 = hours
    if (period === 'PM' && hours !== 12) hour24 += 12
    if (period === 'AM' && hours === 12) hour24 = 0
    
    meetingDate.setHours(hour24, minutes || 0, 0, 0)
    
    // Adjust day of week
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const targetDay = daysOfWeek.indexOf(day)
    const currentDay = meetingDate.getDay()
    
    let dayDiff = targetDay - currentDay
    if (dayDiff < 0) dayDiff += 7 // Next week
    
    meetingDate.setDate(meetingDate.getDate() + dayDiff)
    
    return meetingDate
  }

  /**
   * Get next weekly occurrence of a meeting
   */
  private getNextWeeklyOccurrence(dayOfWeek: string, baseTime: Date): Date {
    const now = new Date()
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const targetDay = daysOfWeek.indexOf(dayOfWeek)
    
    const nextOccurrence = new Date(now)
    nextOccurrence.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0)
    
    const currentDay = nextOccurrence.getDay()
    let dayDiff = targetDay - currentDay
    
    // If it's the same day but time has passed, or if target day is in the past, add a week
    if (dayDiff < 0 || (dayDiff === 0 && nextOccurrence <= now)) {
      dayDiff += 7
    }
    
    nextOccurrence.setDate(nextOccurrence.getDate() + dayDiff)
    
    return nextOccurrence
  }

  /**
   * Load reminders from localStorage
   */
  private loadReminders(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return

      const reminderData = JSON.parse(stored)
      
      Object.values(reminderData).forEach((data: any) => {
        const reminder: MeetingReminder = {
          ...data,
          meetingTime: new Date(data.meetingTime),
          createdAt: new Date(data.createdAt)
        }
        
        this.reminders.set(reminder.id, reminder)
      })

      console.log(`📚 Loaded ${this.reminders.size} meeting reminders`)
    } catch (error) {
      console.error('Failed to load meeting reminders:', error)
    }
  }

  /**
   * Save reminders to localStorage
   */
  private saveReminders(): void {
    try {
      const reminderData: { [key: string]: MeetingReminder } = {}
      
      this.reminders.forEach((reminder, id) => {
        reminderData[id] = reminder
      })

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reminderData))
    } catch (error) {
      console.error('Failed to save meeting reminders:', error)
    }
  }

  /**
   * Get default reminder times
   */
  getDefaultReminderTimes(): number[] {
    return [...this.DEFAULT_REMINDER_TIMES]
  }

  /**
   * Clean up old reminders (older than 30 days)
   */
  cleanupOldReminders(): void {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    let cleaned = 0

    this.reminders.forEach((reminder, id) => {
      if (!reminder.isRecurring && reminder.meetingTime < thirtyDaysAgo) {
        this.removeReminder(id)
        cleaned++
      }
    })

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old reminders`)
    }
  }

  /**
   * Anonymous usage tracking
   */
  private logNotificationShown(reminder: MeetingReminder): void {
    console.log(`📊 Notification shown: ${reminder.reminderTime}min reminder`)
    // Anonymous analytics could be added here
  }

  /**
   * Get reminder statistics for user
   */
  getReminderStats(): {
    totalReminders: number
    activeReminders: number
    upcomingCount: number
    averageReminderTime: number
  } {
    const all = Array.from(this.reminders.values())
    const active = all.filter(r => r.isEnabled)
    const upcoming = this.getUpcomingReminders()
    
    const avgReminderTime = active.length > 0 
      ? active.reduce((sum, r) => sum + r.reminderTime, 0) / active.length 
      : 0

    return {
      totalReminders: all.length,
      activeReminders: active.length,
      upcomingCount: upcoming.length,
      averageReminderTime: Math.round(avgReminderTime)
    }
  }
}

export default new MeetingNotificationService()