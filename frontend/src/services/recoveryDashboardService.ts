/**
 * Recovery Dashboard Service
 * 
 * Comprehensive recovery tracking including sobriety counter, daily check-ins,
 * goals, and analytics while maintaining complete AA anonymity
 */

export interface SobrietyData {
  startDate: Date
  isActive: boolean
  totalDays: number
  milestones: Milestone[]
  relapseHistory: RelapseEntry[]
  lastUpdated: Date
}

export interface Milestone {
  id: string
  days: number
  title: string
  description: string
  achievedDate?: Date
  isAchieved: boolean
  category: 'time' | 'spiritual' | 'service' | 'personal'
  icon: string
}

export interface RelapseEntry {
  id: string
  date: Date
  daysClean: number
  notes?: string
  lessons?: string[]
  isPrivate: boolean
}

export interface DailyCheckIn {
  id: string
  date: string // YYYY-MM-DD
  timestamp: Date
  mood: 1 | 2 | 3 | 4 | 5 // 1=struggling, 5=excellent
  gratitude: string[]
  challenges: string[]
  wins: string[]
  stepsWorked: number[]
  meetingsAttended: number
  litteratureRead: boolean
  prayerMeditation: boolean
  sponsorContact: boolean
  serviceWork: boolean
  notes: string
  cravings: 0 | 1 | 2 | 3 | 4 | 5 // 0=none, 5=severe
  stress: 0 | 1 | 2 | 3 | 4 | 5
  sleep: 'poor' | 'fair' | 'good' | 'excellent'
  tags: string[]
}

export interface RecoveryGoal {
  id: string
  title: string
  description: string
  category: 'spiritual' | 'service' | 'personal' | 'relationships' | 'health' | 'literature'
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  createdDate: Date
  targetDate?: Date
  completedDate?: Date
  progress: number // 0-100
  milestones: GoalMilestone[]
  reflections: GoalReflection[]
  tags: string[]
}

export interface GoalMilestone {
  id: string
  title: string
  description: string
  targetDate?: Date
  completedDate?: Date
  isCompleted: boolean
}

export interface GoalReflection {
  id: string
  date: Date
  content: string
  mood: 'positive' | 'neutral' | 'challenging'
  insights: string[]
}

export interface RecoveryAnalytics {
  overview: {
    totalSoberDays: number
    streakDays: number
    checkInStreak: number
    averageMood: number
    goalsCompleted: number
    activeGoals: number
  }
  trends: {
    moodTrend: 'improving' | 'stable' | 'declining'
    cravingsTrend: 'improving' | 'stable' | 'declining'
    stressTrend: 'improving' | 'stable' | 'declining'
    meetingAttendance: number
    literatureEngagement: number
  }
  insights: AnalyticsInsight[]
  recommendations: string[]
}

export interface AnalyticsInsight {
  id: string
  type: 'pattern' | 'achievement' | 'concern' | 'suggestion'
  title: string
  description: string
  confidence: 'low' | 'medium' | 'high'
  actionItems: string[]
  priority: 'low' | 'medium' | 'high'
}

export interface DashboardStats {
  sobriety: {
    days: number
    nextMilestone: Milestone | null
    daysToMilestone: number
  }
  checkIns: {
    streak: number
    thisWeek: number
    lastCheckIn: Date | null
  }
  goals: {
    active: number
    completed: number
    overdue: number
  }
  engagement: {
    meetingsThisWeek: number
    literaturePages: number
    serviceHours: number
  }
}

export class RecoveryDashboardService {
  private readonly STORAGE_KEYS = {
    sobriety: 'aa_sobriety_data',
    check_ins: 'aa_daily_checkins',
    goals: 'aa_recovery_goals',
    preferences: 'aa_dashboard_preferences'
  }

  private readonly DEFAULT_MILESTONES: Omit<Milestone, 'id' | 'achievedDate' | 'isAchieved'>[] = [
    { days: 1, title: 'One Day', description: 'Your first day of sobriety', category: 'time', icon: '🌅' },
    { days: 7, title: 'One Week', description: 'Seven days of continuous sobriety', category: 'time', icon: '📅' },
    { days: 30, title: 'One Month', description: 'Thirty days of continuous sobriety', category: 'time', icon: '🗓️' },
    { days: 60, title: 'Two Months', description: 'Sixty days of continuous sobriety', category: 'time', icon: '📆' },
    { days: 90, title: 'Three Months', description: 'Ninety days of continuous sobriety', category: 'time', icon: '🎯' },
    { days: 180, title: 'Six Months', description: 'Half a year of continuous sobriety', category: 'time', icon: '⭐' },
    { days: 365, title: 'One Year', description: 'A full year of continuous sobriety', category: 'time', icon: '🏆' },
    { days: 730, title: 'Two Years', description: 'Two years of continuous sobriety', category: 'time', icon: '🥇' },
    { days: 1095, title: 'Three Years', description: 'Three years of continuous sobriety', category: 'time', icon: '💎' },
    { days: 1826, title: 'Five Years', description: 'Five years of continuous sobriety', category: 'time', icon: '👑' },
    { days: 3653, title: 'Ten Years', description: 'A decade of continuous sobriety', category: 'time', icon: '🌟' }
  ]

  constructor() {
    this.initializeDefaultData()
    this.cleanupOldData()
  }

  /**
   * Initialize or get sobriety data
   */
  getSobrietyData(): SobrietyData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.sobriety)
      if (stored) {
        const data = JSON.parse(stored)
        return {
          ...data,
          startDate: new Date(data.startDate),
          lastUpdated: new Date(data.lastUpdated),
          milestones: data.milestones.map((m: any) => ({
            ...m,
            achievedDate: m.achievedDate ? new Date(m.achievedDate) : undefined
          })),
          relapseHistory: data.relapseHistory.map((r: any) => ({
            ...r,
            date: new Date(r.date)
          }))
        }
      }

      // Create initial sobriety data
      return this.createInitialSobrietyData()
    } catch (error) {
      console.error('Failed to get sobriety data:', error)
      return this.createInitialSobrietyData()
    }
  }

  /**
   * Set sobriety start date
   */
  setSobrietyStartDate(startDate: Date): void {
    try {
      const sobrietyData = this.getSobrietyData()
      sobrietyData.startDate = startDate
      sobrietyData.isActive = true
      sobrietyData.totalDays = this.calculateSoberDays(startDate)
      sobrietyData.lastUpdated = new Date()
      
      // Update milestone achievements
      sobrietyData.milestones = this.updateMilestoneAchievements(sobrietyData.milestones, sobrietyData.totalDays)
      
      this.saveSobrietyData(sobrietyData)
      console.log(`✅ Sobriety date set: ${startDate.toDateString()} (${sobrietyData.totalDays} days)`)
    } catch (error) {
      console.error('Failed to set sobriety start date:', error)
    }
  }

  /**
   * Record a relapse (restart sobriety counter)
   */
  recordRelapse(notes?: string, lessons?: string[]): void {
    try {
      const sobrietyData = this.getSobrietyData()
      
      // Record the relapse
      const relapseEntry: RelapseEntry = {
        id: `relapse_${Date.now()}`,
        date: new Date(),
        daysClean: sobrietyData.totalDays,
        notes: notes || '',
        lessons: lessons || [],
        isPrivate: true
      }
      
      sobrietyData.relapseHistory.push(relapseEntry)
      sobrietyData.startDate = new Date()
      sobrietyData.totalDays = 0
      sobrietyData.isActive = true
      sobrietyData.lastUpdated = new Date()
      
      // Reset milestones
      sobrietyData.milestones = this.createDefaultMilestones()
      
      this.saveSobrietyData(sobrietyData)
      console.log(`📝 Relapse recorded. New sobriety date: ${sobrietyData.startDate.toDateString()}`)
    } catch (error) {
      console.error('Failed to record relapse:', error)
    }
  }

  /**
   * Add daily check-in
   */
  addDailyCheckIn(checkIn: Omit<DailyCheckIn, 'id' | 'timestamp'>): string {
    try {
      const checkInId = `checkin_${Date.now()}`
      const newCheckIn: DailyCheckIn = {
        ...checkIn,
        id: checkInId,
        timestamp: new Date()
      }

      const stored = localStorage.getItem(this.STORAGE_KEYS.check_ins) || '[]'
      const checkIns = JSON.parse(stored)
      
      // Remove any existing check-in for the same date
      const filtered = checkIns.filter((c: any) => c.date !== checkIn.date)
      filtered.push(newCheckIn)
      
      localStorage.setItem(this.STORAGE_KEYS.check_ins, JSON.stringify(filtered))
      
      console.log(`✅ Daily check-in added for ${checkIn.date}`)
      return checkInId
    } catch (error) {
      console.error('Failed to add daily check-in:', error)
      return ''
    }
  }

  /**
   * Get daily check-ins
   */
  getDailyCheckIns(limit?: number): DailyCheckIn[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.check_ins) || '[]'
      let checkIns = JSON.parse(stored).map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp)
      }))

      // Sort by date descending
      checkIns.sort((a: DailyCheckIn, b: DailyCheckIn) => b.date.localeCompare(a.date))
      
      return limit ? checkIns.slice(0, limit) : checkIns
    } catch (error) {
      console.error('Failed to get daily check-ins:', error)
      return []
    }
  }

  /**
   * Get check-in for specific date
   */
  getCheckInForDate(date: string): DailyCheckIn | null {
    const checkIns = this.getDailyCheckIns()
    return checkIns.find(c => c.date === date) || null
  }

  /**
   * Create recovery goal
   */
  createRecoveryGoal(goal: Omit<RecoveryGoal, 'id' | 'createdDate' | 'progress' | 'milestones' | 'reflections'>): string {
    try {
      const goalId = `goal_${Date.now()}`
      const newGoal: RecoveryGoal = {
        ...goal,
        id: goalId,
        createdDate: new Date(),
        progress: 0,
        milestones: [],
        reflections: []
      }

      const stored = localStorage.getItem(this.STORAGE_KEYS.goals) || '[]'
      const goals = JSON.parse(stored)
      goals.push(newGoal)
      
      localStorage.setItem(this.STORAGE_KEYS.goals, JSON.stringify(goals))
      
      console.log(`🎯 Recovery goal created: ${goal.title}`)
      return goalId
    } catch (error) {
      console.error('Failed to create recovery goal:', error)
      return ''
    }
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: string, progress: number, reflection?: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.goals) || '[]'
      const goals = JSON.parse(stored)
      
      const goalIndex = goals.findIndex((g: any) => g.id === goalId)
      if (goalIndex === -1) return

      goals[goalIndex].progress = Math.max(0, Math.min(100, progress))
      
      if (progress >= 100 && goals[goalIndex].status === 'active') {
        goals[goalIndex].status = 'completed'
        goals[goalIndex].completedDate = new Date()
      }

      if (reflection) {
        const newReflection: GoalReflection = {
          id: `reflection_${Date.now()}`,
          date: new Date(),
          content: reflection,
          mood: 'positive',
          insights: []
        }
        goals[goalIndex].reflections.push(newReflection)
      }
      
      localStorage.setItem(this.STORAGE_KEYS.goals, JSON.stringify(goals))
      
      console.log(`📈 Goal progress updated: ${progress}%`)
    } catch (error) {
      console.error('Failed to update goal progress:', error)
    }
  }

  /**
   * Get recovery goals
   */
  getRecoveryGoals(status?: RecoveryGoal['status']): RecoveryGoal[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.goals) || '[]'
      let goals = JSON.parse(stored).map((g: any) => ({
        ...g,
        createdDate: new Date(g.createdDate),
        targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
        completedDate: g.completedDate ? new Date(g.completedDate) : undefined,
        reflections: g.reflections.map((r: any) => ({
          ...r,
          date: new Date(r.date)
        }))
      }))

      if (status) {
        goals = goals.filter((g: RecoveryGoal) => g.status === status)
      }

      return goals.sort((a: RecoveryGoal, b: RecoveryGoal) => b.createdDate.getTime() - a.createdDate.getTime())
    } catch (error) {
      console.error('Failed to get recovery goals:', error)
      return []
    }
  }

  /**
   * Get dashboard statistics
   */
  getDashboardStats(): DashboardStats {
    try {
      const sobrietyData = this.getSobrietyData()
      const checkIns = this.getDailyCheckIns()
      const goals = this.getRecoveryGoals()
      
      // Calculate check-in streak
      const checkInStreak = this.calculateCheckInStreak(checkIns)
      
      // Get next milestone
      const nextMilestone = sobrietyData.milestones.find(m => !m.isAchieved) || null
      const daysToMilestone = nextMilestone ? nextMilestone.days - sobrietyData.totalDays : 0
      
      // Calculate this week's check-ins
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const thisWeekCheckIns = checkIns.filter(c => new Date(c.date) >= oneWeekAgo).length
      
      // Calculate engagement metrics
      const recentCheckIns = checkIns.slice(0, 7) // Last 7 check-ins
      const meetingsThisWeek = recentCheckIns.reduce((sum, c) => sum + c.meetingsAttended, 0)
      
      return {
        sobriety: {
          days: sobrietyData.totalDays,
          nextMilestone,
          daysToMilestone: Math.max(0, daysToMilestone)
        },
        checkIns: {
          streak: checkInStreak,
          thisWeek: thisWeekCheckIns,
          lastCheckIn: checkIns.length > 0 ? new Date(checkIns[0].date) : null
        },
        goals: {
          active: goals.filter(g => g.status === 'active').length,
          completed: goals.filter(g => g.status === 'completed').length,
          overdue: goals.filter(g => 
            g.status === 'active' && 
            g.targetDate && 
            g.targetDate < new Date()
          ).length
        },
        engagement: {
          meetingsThisWeek,
          literaturePages: recentCheckIns.filter(c => c.litteratureRead).length,
          serviceHours: recentCheckIns.filter(c => c.serviceWork).length
        }
      }
    } catch (error) {
      console.error('Failed to get dashboard stats:', error)
      return {
        sobriety: { days: 0, nextMilestone: null, daysToMilestone: 0 },
        checkIns: { streak: 0, thisWeek: 0, lastCheckIn: null },
        goals: { active: 0, completed: 0, overdue: 0 },
        engagement: { meetingsThisWeek: 0, literaturePages: 0, serviceHours: 0 }
      }
    }
  }

  /**
   * Get recovery analytics and insights
   */
  getRecoveryAnalytics(): RecoveryAnalytics {
    try {
      const sobrietyData = this.getSobrietyData()
      const checkIns = this.getDailyCheckIns(30) // Last 30 days
      const goals = this.getRecoveryGoals()
      
      // Calculate trends
      const moodTrend = this.calculateTrend(checkIns.map(c => c.mood))
      const cravingsTrend = this.calculateTrend(checkIns.map(c => c.cravings))
      const stressTrend = this.calculateTrend(checkIns.map(c => c.stress))
      
      // Calculate engagement metrics
      const meetingAttendance = checkIns.reduce((sum, c) => sum + c.meetingsAttended, 0) / Math.max(checkIns.length, 1)
      const literatureEngagement = (checkIns.filter(c => c.litteratureRead).length / Math.max(checkIns.length, 1)) * 100
      
      const analytics: RecoveryAnalytics = {
        overview: {
          totalSoberDays: sobrietyData.totalDays,
          streakDays: sobrietyData.totalDays,
          checkInStreak: this.calculateCheckInStreak(checkIns),
          averageMood: checkIns.reduce((sum, c) => sum + c.mood, 0) / Math.max(checkIns.length, 1),
          goalsCompleted: goals.filter(g => g.status === 'completed').length,
          activeGoals: goals.filter(g => g.status === 'active').length
        },
        trends: {
          moodTrend,
          cravingsTrend,
          stressTrend,
          meetingAttendance: Math.round(meetingAttendance * 10) / 10,
          literatureEngagement: Math.round(literatureEngagement)
        },
        insights: this.generateInsights(checkIns, goals, sobrietyData),
        recommendations: this.generateRecommendations(checkIns, goals, sobrietyData)
      }
      
      return analytics
    } catch (error) {
      console.error('Failed to get recovery analytics:', error)
      return {
        overview: { totalSoberDays: 0, streakDays: 0, checkInStreak: 0, averageMood: 3, goalsCompleted: 0, activeGoals: 0 },
        trends: { moodTrend: 'stable', cravingsTrend: 'stable', stressTrend: 'stable', meetingAttendance: 0, literatureEngagement: 0 },
        insights: [],
        recommendations: []
      }
    }
  }

  // Private helper methods

  private createInitialSobrietyData(): SobrietyData {
    return {
      startDate: new Date(),
      isActive: false,
      totalDays: 0,
      milestones: this.createDefaultMilestones(),
      relapseHistory: [],
      lastUpdated: new Date()
    }
  }

  private createDefaultMilestones(): Milestone[] {
    return this.DEFAULT_MILESTONES.map((milestone, index) => ({
      ...milestone,
      id: `milestone_${index}`,
      isAchieved: false
    }))
  }

  private calculateSoberDays(startDate: Date): number {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - startDate.getTime())
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  private updateMilestoneAchievements(milestones: Milestone[], totalDays: number): Milestone[] {
    return milestones.map(milestone => {
      if (!milestone.isAchieved && totalDays >= milestone.days) {
        return {
          ...milestone,
          isAchieved: true,
          achievedDate: new Date()
        }
      }
      return milestone
    })
  }

  private saveSobrietyData(data: SobrietyData): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.sobriety, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save sobriety data:', error)
    }
  }

  private calculateCheckInStreak(checkIns: DailyCheckIn[]): number {
    if (checkIns.length === 0) return 0
    
    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    let currentDate = new Date()
    
    for (let i = 0; i < 365; i++) { // Check up to a year
      const dateStr = currentDate.toISOString().split('T')[0]
      const hasCheckIn = checkIns.some(c => c.date === dateStr)
      
      if (hasCheckIn) {
        streak++
      } else if (dateStr !== today) {
        // Only break streak if it's not today (user might not have checked in yet)
        break
      }
      
      currentDate.setDate(currentDate.getDate() - 1)
    }
    
    return streak
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 3) return 'stable'
    
    const recent = values.slice(0, Math.ceil(values.length / 2))
    const older = values.slice(Math.ceil(values.length / 2))
    
    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length
    const olderAvg = older.reduce((sum, v) => sum + v, 0) / older.length
    
    const diff = recentAvg - olderAvg
    
    if (Math.abs(diff) < 0.3) return 'stable'
    return diff > 0 ? 'improving' : 'declining'
  }

  private generateInsights(checkIns: DailyCheckIn[], goals: RecoveryGoal[], sobrietyData: SobrietyData): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = []
    
    // Meeting attendance insight
    const avgMeetings = checkIns.reduce((sum, c) => sum + c.meetingsAttended, 0) / Math.max(checkIns.length, 1)
    if (avgMeetings < 1) {
      insights.push({
        id: 'low_meeting_attendance',
        type: 'concern',
        title: 'Low Meeting Attendance',
        description: `You're averaging ${avgMeetings.toFixed(1)} meetings per check-in. Consider increasing meeting attendance.`,
        confidence: 'high',
        actionItems: ['Find meetings near you', 'Try virtual meetings', 'Set meeting reminders'],
        priority: 'high'
      })
    }
    
    // Milestone achievement
    const recentMilestones = sobrietyData.milestones.filter(m => 
      m.isAchieved && 
      m.achievedDate && 
      m.achievedDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    )
    
    if (recentMilestones.length > 0) {
      insights.push({
        id: 'recent_milestone',
        type: 'achievement',
        title: 'Milestone Achieved!',
        description: `Congratulations on reaching ${recentMilestones[0].title}!`,
        confidence: 'high',
        actionItems: ['Celebrate your achievement', 'Share with your sponsor', 'Set next goal'],
        priority: 'medium'
      })
    }
    
    return insights
  }

  private generateRecommendations(checkIns: DailyCheckIn[], goals: RecoveryGoal[], sobrietyData: SobrietyData): string[] {
    const recommendations: string[] = []
    
    // Check-in consistency
    const streak = this.calculateCheckInStreak(checkIns)
    if (streak < 3) {
      recommendations.push('Consider daily check-ins to track your recovery progress')
    }
    
    // Goal setting
    const activeGoals = goals.filter(g => g.status === 'active')
    if (activeGoals.length === 0) {
      recommendations.push('Set some recovery goals to focus your efforts')
    }
    
    // Literature engagement
    const literatureRate = (checkIns.filter(c => c.litteratureRead).length / Math.max(checkIns.length, 1)) * 100
    if (literatureRate < 50) {
      recommendations.push('Try to read AA literature more regularly')
    }
    
    return recommendations
  }

  private initializeDefaultData(): void {
    // Initialize with default goals if none exist
    const goals = this.getRecoveryGoals()
    if (goals.length === 0) {
      this.createDefaultGoals()
    }
  }

  private createDefaultGoals(): void {
    const defaultGoals = [
      {
        title: 'Complete Step 1 Study',
        description: 'Work through Step 1 with sponsor and write about powerlessness',
        category: 'spiritual' as const,
        priority: 'high' as const,
        status: 'active' as const,
        tags: ['steps', 'sponsor']
      },
      {
        title: 'Attend 90 Meetings in 90 Days',
        description: 'Commit to 90 meetings in first 90 days of recovery',
        category: 'service' as const,
        priority: 'high' as const,
        status: 'active' as const,
        tags: ['meetings', '90in90']
      }
    ]

    defaultGoals.forEach(goal => this.createRecoveryGoal(goal))
  }

  private cleanupOldData(): void {
    try {
      // Clean up check-ins older than 1 year
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      const yearAgoStr = oneYearAgo.toISOString().split('T')[0]
      
      const checkIns = this.getDailyCheckIns()
      const recentCheckIns = checkIns.filter(c => c.date >= yearAgoStr)
      
      if (recentCheckIns.length !== checkIns.length) {
        localStorage.setItem(this.STORAGE_KEYS.check_ins, JSON.stringify(recentCheckIns))
        console.log(`🧹 Cleaned up ${checkIns.length - recentCheckIns.length} old check-ins`)
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error)
    }
  }
}

export default new RecoveryDashboardService()