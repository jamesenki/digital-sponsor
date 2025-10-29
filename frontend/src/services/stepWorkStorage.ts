/**
 * Step Work Storage Service
 * 
 * Handles client-side storage of step work with complete privacy
 * No data sent to servers - everything stored locally
 */

import type { 
  StepWorkDocument, 
  ResentmentInventory, 
  FearInventory, 
  AmendsItem 
} from '@/types'

export class StepWorkStorageService {
  private readonly STORAGE_PREFIX = 'ds_stepwork_'
  private readonly RESENTMENTS_KEY = 'ds_resentments'
  private readonly FEARS_KEY = 'ds_fears'
  private readonly AMENDS_KEY = 'ds_amends'
  private readonly PROGRESS_KEY = 'ds_step_progress'

  /**
   * Save step work document
   */
  saveStepWork(stepWork: StepWorkDocument): void {
    try {
      const key = `${this.STORAGE_PREFIX}step_${stepWork.stepNumber}`
      const data = JSON.stringify({
        ...stepWork,
        updatedAt: new Date()
      })
      
      localStorage.setItem(key, data)
      console.log(`✅ Step ${stepWork.stepNumber} work saved locally`)
    } catch (error) {
      console.error('Failed to save step work:', error)
      throw new Error('Unable to save step work. Please check your browser storage.')
    }
  }

  /**
   * Load step work document
   */
  loadStepWork(stepNumber: number): StepWorkDocument | null {
    try {
      const key = `${this.STORAGE_PREFIX}step_${stepNumber}`
      const data = localStorage.getItem(key)
      
      if (!data) return null
      
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to load step work:', error)
      return null
    }
  }

  /**
   * Get all step work documents
   */
  getAllStepWork(): StepWorkDocument[] {
    const stepWorks: StepWorkDocument[] = []
    
    for (let i = 1; i <= 12; i++) {
      const stepWork = this.loadStepWork(i)
      if (stepWork) {
        stepWorks.push(stepWork)
      }
    }
    
    return stepWorks.sort((a, b) => a.stepNumber - b.stepNumber)
  }

  /**
   * Delete step work document
   */
  deleteStepWork(stepNumber: number): void {
    try {
      const key = `${this.STORAGE_PREFIX}step_${stepNumber}`
      localStorage.removeItem(key)
      console.log(`🗑️ Step ${stepNumber} work deleted`)
    } catch (error) {
      console.error('Failed to delete step work:', error)
    }
  }

  /**
   * Save resentment inventory (4th Step)
   */
  saveResentments(resentments: ResentmentInventory[]): void {
    try {
      const data = JSON.stringify({
        resentments,
        updatedAt: new Date()
      })
      
      localStorage.setItem(this.RESENTMENTS_KEY, data)
      console.log(`✅ ${resentments.length} resentments saved locally`)
    } catch (error) {
      console.error('Failed to save resentments:', error)
      throw new Error('Unable to save resentment inventory.')
    }
  }

  /**
   * Load resentment inventory
   */
  loadResentments(): ResentmentInventory[] {
    try {
      const data = localStorage.getItem(this.RESENTMENTS_KEY)
      if (!data) return []
      
      const parsed = JSON.parse(data)
      return parsed.resentments || []
    } catch (error) {
      console.error('Failed to load resentments:', error)
      return []
    }
  }

  /**
   * Save fear inventory (4th Step)
   */
  saveFears(fears: FearInventory[]): void {
    try {
      const data = JSON.stringify({
        fears,
        updatedAt: new Date()
      })
      
      localStorage.setItem(this.FEARS_KEY, data)
      console.log(`✅ ${fears.length} fears saved locally`)
    } catch (error) {
      console.error('Failed to save fears:', error)
      throw new Error('Unable to save fear inventory.')
    }
  }

  /**
   * Load fear inventory
   */
  loadFears(): FearInventory[] {
    try {
      const data = localStorage.getItem(this.FEARS_KEY)
      if (!data) return []
      
      const parsed = JSON.parse(data)
      return parsed.fears || []
    } catch (error) {
      console.error('Failed to load fears:', error)
      return []
    }
  }

  /**
   * Save amends list (Steps 8 & 9)
   */
  saveAmends(amends: AmendsItem[]): void {
    try {
      const data = JSON.stringify({
        amends,
        updatedAt: new Date()
      })
      
      localStorage.setItem(this.AMENDS_KEY, data)
      console.log(`✅ ${amends.length} amends saved locally`)
    } catch (error) {
      console.error('Failed to save amends:', error)
      throw new Error('Unable to save amends list.')
    }
  }

  /**
   * Load amends list
   */
  loadAmends(): AmendsItem[] {
    try {
      const data = localStorage.getItem(this.AMENDS_KEY)
      if (!data) return []
      
      const parsed = JSON.parse(data)
      return parsed.amends || []
    } catch (error) {
      console.error('Failed to load amends:', error)
      return []
    }
  }

  /**
   * Save step progress summary
   */
  saveStepProgress(stepNumber: number, progress: number, isComplete: boolean): void {
    try {
      const existingProgress = this.loadStepProgress()
      
      existingProgress[stepNumber] = {
        stepNumber,
        progress,
        isComplete,
        updatedAt: new Date()
      }
      
      localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(existingProgress))
    } catch (error) {
      console.error('Failed to save step progress:', error)
    }
  }

  /**
   * Load step progress summary
   */
  loadStepProgress(): { [key: number]: any } {
    try {
      const data = localStorage.getItem(this.PROGRESS_KEY)
      if (!data) return {}
      
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to load step progress:', error)
      return {}
    }
  }

  /**
   * Export all step work data for backup
   */
  exportAllData(): any {
    try {
      return {
        stepWork: this.getAllStepWork(),
        resentments: this.loadResentments(),
        fears: this.loadFears(),
        amends: this.loadAmends(),
        progress: this.loadStepProgress(),
        exportedAt: new Date(),
        version: '1.0'
      }
    } catch (error) {
      console.error('Failed to export data:', error)
      throw new Error('Unable to export step work data.')
    }
  }

  /**
   * Import step work data from backup
   */
  importAllData(data: any): void {
    try {
      if (data.stepWork) {
        data.stepWork.forEach((stepWork: StepWorkDocument) => {
          this.saveStepWork(stepWork)
        })
      }
      
      if (data.resentments) {
        this.saveResentments(data.resentments)
      }
      
      if (data.fears) {
        this.saveFears(data.fears)
      }
      
      if (data.amends) {
        this.saveAmends(data.amends)
      }
      
      if (data.progress) {
        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(data.progress))
      }
      
      console.log('✅ Step work data imported successfully')
    } catch (error) {
      console.error('Failed to import data:', error)
      throw new Error('Unable to import step work data.')
    }
  }

  /**
   * Clear all step work data (with confirmation)
   */
  clearAllData(): void {
    try {
      // Clear all step work
      for (let i = 1; i <= 12; i++) {
        this.deleteStepWork(i)
      }
      
      // Clear inventories
      localStorage.removeItem(this.RESENTMENTS_KEY)
      localStorage.removeItem(this.FEARS_KEY)
      localStorage.removeItem(this.AMENDS_KEY)
      localStorage.removeItem(this.PROGRESS_KEY)
      
      console.log('🗑️ All step work data cleared')
    } catch (error) {
      console.error('Failed to clear data:', error)
      throw new Error('Unable to clear step work data.')
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; available: number; total: number } {
    try {
      let used = 0
      
      // Calculate used storage for step work
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          const value = localStorage.getItem(key)
          if (value) {
            used += key.length + value.length
          }
        }
      }
      
      // Add other step work related storage
      const keys = [this.RESENTMENTS_KEY, this.FEARS_KEY, this.AMENDS_KEY, this.PROGRESS_KEY]
      keys.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          used += key.length + value.length
        }
      })
      
      // Estimate total available storage (typically 5-10MB per origin)
      const total = 5 * 1024 * 1024 // 5MB estimate
      const available = total - used
      
      return { used, available, total }
    } catch (error) {
      console.error('Failed to get storage info:', error)
      return { used: 0, available: 0, total: 0 }
    }
  }

  /**
   * Check if storage is available
   */
  isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, 'test')
      localStorage.removeItem(test)
      return true
    } catch (error) {
      return false
    }
  }
}

export default StepWorkStorageService