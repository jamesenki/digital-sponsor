/**
 * Sync Service
 * 
 * Provides encrypted cloud backup and device synchronization for Digital Sponsor data
 * while maintaining complete anonymity per AA Tradition 12
 */

export interface SyncData {
  // User preferences and settings
  preferences: {
    theme: any
    accessibility: any
    notifications: any
    privacy: any
  }
  
  // Recovery tracking data
  recovery: {
    sobriety: any
    checkIns: any[]
    goals: any[]
    milestones: any[]
  }
  
  // Literature and study progress
  literature: {
    progress: any[]
    bookmarks: any[]
    notes: any[]
    reflections: any[]
  }
  
  // Step work documents
  stepWork: {
    documents: any[]
    progress: any[]
    responses: any[]
  }
  
  // Chat history (if enabled by user)
  chat: {
    conversations: any[]
    favorites: any[]
    settings: any
  }
  
  // Meeting data
  meetings: {
    favorites: any[]
    history: any[]
    reminders: any[]
  }
  
  // Metadata
  deviceId: string
  lastSync: Date
  version: string
  encrypted: boolean
}

export interface SyncConfig {
  cloudProvider: 'azure' | 'aws' | 'gcp' | 'custom'
  endpoint?: string
  encryptionEnabled: boolean
  syncInterval: number // minutes
  autoSync: boolean
  conflictResolution: 'local' | 'remote' | 'merge' | 'manual'
  retentionDays: number
  maxBackups: number
}

export interface SyncStatus {
  isOnline: boolean
  lastSync: Date | null
  lastBackup: Date | null
  syncInProgress: boolean
  backupInProgress: boolean
  hasConflicts: boolean
  errorMessage: string | null
  pendingChanges: number
}

export interface ConflictItem {
  id: string
  key: string
  localValue: any
  remoteValue: any
  localTimestamp: Date
  remoteTimestamp: Date
  type: 'preference' | 'data' | 'document'
}

export class SyncService {
  private readonly STORAGE_KEYS = {
    config: 'aa_sync_config',
    deviceId: 'aa_device_id',
    lastSync: 'aa_last_sync',
    syncQueue: 'aa_sync_queue',
    conflicts: 'aa_sync_conflicts'
  }

  private config: SyncConfig
  private deviceId: string
  private syncStatus: SyncStatus
  private encryptionKey: string | null = null
  private syncInterval: number | null = null
  private observers: Set<(status: SyncStatus) => void> = new Set()

  constructor() {
    this.config = this.loadConfig()
    this.deviceId = this.getOrCreateDeviceId()
    this.syncStatus = this.initializeSyncStatus()
    this.setupAutoSync()
  }

  /**
   * Initialize or configure sync
   */
  async initializeSync(userPassphrase?: string): Promise<boolean> {
    try {
      if (this.config.encryptionEnabled && userPassphrase) {
        this.encryptionKey = await this.deriveEncryptionKey(userPassphrase)
      }

      // Test connectivity if cloud provider is configured
      if (this.config.cloudProvider) {
        const isConnected = await this.testConnection()
        this.updateSyncStatus({ isOnline: isConnected })
        
        if (isConnected) {
          console.log('🔄 Sync service initialized successfully')
          return true
        }
      }

      console.log('📱 Sync service initialized (offline mode)')
      return true
    } catch (error) {
      console.error('Failed to initialize sync service:', error)
      this.updateSyncStatus({ 
        errorMessage: 'Failed to initialize sync service',
        isOnline: false 
      })
      return false
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }

  /**
   * Update sync configuration
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()
    
    if (newConfig.syncInterval) {
      this.setupAutoSync()
    }
  }

  /**
   * Create encrypted backup to cloud storage
   */
  async createBackup(description?: string): Promise<string | null> {
    try {
      this.updateSyncStatus({ backupInProgress: true, errorMessage: null })

      // Collect all user data
      const syncData = await this.collectUserData()
      
      // Encrypt if enabled
      let dataToStore = syncData
      if (this.config.encryptionEnabled && this.encryptionKey) {
        dataToStore = await this.encryptData(syncData)
      }

      // Upload to cloud storage
      const backupId = await this.uploadToCloud(dataToStore, description)
      
      if (backupId) {
        this.updateSyncStatus({ 
          lastBackup: new Date(),
          backupInProgress: false
        })
        
        console.log(`✅ Backup created successfully: ${backupId}`)
        return backupId
      }

      throw new Error('Failed to upload backup')
    } catch (error) {
      console.error('Backup creation failed:', error)
      this.updateSyncStatus({ 
        backupInProgress: false,
        errorMessage: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      return null
    }
  }

  /**
   * Restore from encrypted backup
   */
  async restoreFromBackup(backupId: string, userPassphrase?: string): Promise<boolean> {
    try {
      this.updateSyncStatus({ syncInProgress: true, errorMessage: null })

      // Download from cloud storage
      const encryptedData = await this.downloadFromCloud(backupId)
      
      if (!encryptedData) {
        throw new Error('Backup not found or inaccessible')
      }

      // Decrypt if needed
      let syncData: SyncData
      if (this.config.encryptionEnabled) {
        if (!userPassphrase) {
          throw new Error('Passphrase required for encrypted backup')
        }
        
        const decryptionKey = await this.deriveEncryptionKey(userPassphrase)
        syncData = await this.decryptData(encryptedData, decryptionKey)
      } else {
        syncData = encryptedData
      }

      // Apply data with conflict resolution
      await this.applyRemoteData(syncData)
      
      this.updateSyncStatus({ 
        lastSync: new Date(),
        syncInProgress: false
      })
      
      console.log('✅ Backup restored successfully')
      return true
    } catch (error) {
      console.error('Backup restoration failed:', error)
      this.updateSyncStatus({ 
        syncInProgress: false,
        errorMessage: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      return false
    }
  }

  /**
   * Sync with cloud storage
   */
  async performSync(): Promise<boolean> {
    if (!this.config.cloudProvider || this.syncStatus.syncInProgress) {
      return false
    }

    try {
      this.updateSyncStatus({ syncInProgress: true, errorMessage: null })

      // Get local and remote data
      const localData = await this.collectUserData()
      const remoteData = await this.getLatestRemoteData()

      if (!remoteData) {
        // No remote data, perform initial backup
        const backupId = await this.createBackup('Initial sync')
        return !!backupId
      }

      // Detect conflicts
      const conflicts = await this.detectConflicts(localData, remoteData)
      
      if (conflicts.length > 0) {
        await this.handleConflicts(conflicts)
      } else {
        // Merge and upload changes
        const mergedData = await this.mergeData(localData, remoteData)
        await this.uploadToCloud(mergedData, 'Sync update')
        await this.applyRemoteData(mergedData)
      }

      this.updateSyncStatus({ 
        lastSync: new Date(),
        syncInProgress: false,
        hasConflicts: conflicts.length > 0
      })

      console.log('🔄 Sync completed successfully')
      return true
    } catch (error) {
      console.error('Sync failed:', error)
      this.updateSyncStatus({ 
        syncInProgress: false,
        errorMessage: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      return false
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<Array<{ id: string, date: Date, description?: string, size: number }>> {
    try {
      return await this.listCloudBackups()
    } catch (error) {
      console.error('Failed to list backups:', error)
      return []
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      return await this.deleteCloudBackup(backupId)
    } catch (error) {
      console.error('Failed to delete backup:', error)
      return false
    }
  }

  /**
   * Export data for manual backup
   */
  async exportData(includePersonalData = true): Promise<string> {
    const data = await this.collectUserData()
    
    if (!includePersonalData) {
      // Remove personal identifiers while keeping recovery data
      data.chat = { conversations: [], favorites: [], settings: {} }
      data.stepWork.responses = data.stepWork.responses.map(r => ({ ...r, content: '[REMOVED]' }))
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Import data from manual backup
   */
  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData) as SyncData
      await this.applyRemoteData(data)
      console.log('✅ Data imported successfully')
      return true
    } catch (error) {
      console.error('Data import failed:', error)
      return false
    }
  }

  // Private implementation methods

  private loadConfig(): SyncConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.config)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load sync config:', error)
    }

    return {
      cloudProvider: 'azure', // Default to Azure Blob Storage
      encryptionEnabled: true,
      syncInterval: 60, // 1 hour
      autoSync: false,
      conflictResolution: 'manual',
      retentionDays: 90,
      maxBackups: 10
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.config, JSON.stringify(this.config))
    } catch (error) {
      console.error('Failed to save sync config:', error)
    }
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem(this.STORAGE_KEYS.deviceId)
    
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem(this.STORAGE_KEYS.deviceId, deviceId)
    }
    
    return deviceId
  }

  private initializeSyncStatus(): SyncStatus {
    const lastSyncStr = localStorage.getItem(this.STORAGE_KEYS.lastSync)
    
    return {
      isOnline: navigator.onLine,
      lastSync: lastSyncStr ? new Date(lastSyncStr) : null,
      lastBackup: null,
      syncInProgress: false,
      backupInProgress: false,
      hasConflicts: false,
      errorMessage: null,
      pendingChanges: 0
    }
  }

  private setupAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    if (this.config.autoSync && this.config.syncInterval > 0) {
      this.syncInterval = window.setInterval(() => {
        if (navigator.onLine && !this.syncStatus.syncInProgress) {
          this.performSync()
        }
      }, this.config.syncInterval * 60 * 1000)
    }
  }

  private async deriveEncryptionKey(passphrase: string): Promise<string> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase + this.deviceId), // Add device salt
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('digital_sponsor_salt_2024'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )

    const exportedKey = await crypto.subtle.exportKey('raw', key)
    return Array.from(new Uint8Array(exportedKey))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  private async encryptData(data: SyncData): Promise<any> {
    if (!this.encryptionKey) throw new Error('No encryption key available')

    const jsonData = JSON.stringify(data)
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(jsonData)

    const keyBuffer = new Uint8Array(
      this.encryptionKey.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    )

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      dataBuffer
    )

    return {
      encryptedData: Array.from(new Uint8Array(encryptedBuffer)),
      iv: Array.from(iv),
      version: '1.0'
    }
  }

  private async decryptData(encryptedData: any, decryptionKey: string): Promise<SyncData> {
    const keyBuffer = new Uint8Array(
      decryptionKey.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    )

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )

    const encryptedBuffer = new Uint8Array(encryptedData.encryptedData)
    const iv = new Uint8Array(encryptedData.iv)

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedBuffer
    )

    const decoder = new TextDecoder()
    const jsonData = decoder.decode(decryptedBuffer)
    return JSON.parse(jsonData)
  }

  private async collectUserData(): Promise<SyncData> {
    // Collect data from all local storage keys
    const preferences = {
      theme: JSON.parse(localStorage.getItem('aa_theme_preferences') || '{}'),
      accessibility: JSON.parse(localStorage.getItem('aa_accessibility_preferences') || '{}'),
      notifications: JSON.parse(localStorage.getItem('aa_notification_preferences') || '{}'),
      privacy: JSON.parse(localStorage.getItem('aa_privacy_preferences') || '{}')
    }

    const recovery = {
      sobriety: JSON.parse(localStorage.getItem('aa_sobriety_data') || '{}'),
      checkIns: JSON.parse(localStorage.getItem('aa_daily_checkins') || '[]'),
      goals: JSON.parse(localStorage.getItem('aa_recovery_goals') || '[]'),
      milestones: JSON.parse(localStorage.getItem('aa_milestones') || '[]')
    }

    const literature = {
      progress: JSON.parse(localStorage.getItem('aa_literature_progress') || '[]'),
      bookmarks: JSON.parse(localStorage.getItem('aa_literature_bookmarks') || '[]'),
      notes: JSON.parse(localStorage.getItem('aa_literature_notes') || '[]'),
      reflections: JSON.parse(localStorage.getItem('aa_daily_reflections') || '[]')
    }

    const stepWork = {
      documents: JSON.parse(localStorage.getItem('aa_step_documents') || '[]'),
      progress: JSON.parse(localStorage.getItem('aa_step_progress') || '[]'),
      responses: JSON.parse(localStorage.getItem('aa_step_responses') || '[]')
    }

    const chat = {
      conversations: JSON.parse(localStorage.getItem('aa_chat_conversations') || '[]'),
      favorites: JSON.parse(localStorage.getItem('aa_chat_favorites') || '[]'),
      settings: JSON.parse(localStorage.getItem('aa_chat_settings') || '{}')
    }

    const meetings = {
      favorites: JSON.parse(localStorage.getItem('aa_meeting_favorites') || '[]'),
      history: JSON.parse(localStorage.getItem('aa_meeting_history') || '[]'),
      reminders: JSON.parse(localStorage.getItem('aa_meeting_reminders') || '[]')
    }

    return {
      preferences,
      recovery,
      literature,
      stepWork,
      chat,
      meetings,
      deviceId: this.deviceId,
      lastSync: new Date(),
      version: '1.0',
      encrypted: this.config.encryptionEnabled
    }
  }

  private async testConnection(): Promise<boolean> {
    // Mock implementation - would test actual cloud provider
    return navigator.onLine
  }

  private async uploadToCloud(data: any, description?: string): Promise<string | null> {
    // Mock implementation - would integrate with actual cloud provider
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log(`📤 Mock upload to cloud: ${backupId}`)
    return backupId
  }

  private async downloadFromCloud(backupId: string): Promise<any> {
    // Mock implementation - would integrate with actual cloud provider
    console.log(`📥 Mock download from cloud: ${backupId}`)
    return null
  }

  private async getLatestRemoteData(): Promise<SyncData | null> {
    // Mock implementation
    return null
  }

  private async listCloudBackups(): Promise<Array<{ id: string, date: Date, description?: string, size: number }>> {
    // Mock implementation
    return []
  }

  private async deleteCloudBackup(backupId: string): Promise<boolean> {
    // Mock implementation
    console.log(`🗑️ Mock delete backup: ${backupId}`)
    return true
  }

  private async detectConflicts(localData: SyncData, remoteData: SyncData): Promise<ConflictItem[]> {
    // Mock implementation - would implement actual conflict detection
    return []
  }

  private async handleConflicts(conflicts: ConflictItem[]): Promise<void> {
    // Store conflicts for user resolution
    localStorage.setItem(this.STORAGE_KEYS.conflicts, JSON.stringify(conflicts))
    this.updateSyncStatus({ hasConflicts: true })
  }

  private async mergeData(localData: SyncData, remoteData: SyncData): Promise<SyncData> {
    // Mock implementation - would implement smart merging
    return {
      ...localData,
      lastSync: new Date()
    }
  }

  private async applyRemoteData(data: SyncData): Promise<void> {
    // Apply synced data to local storage
    localStorage.setItem('aa_theme_preferences', JSON.stringify(data.preferences.theme))
    localStorage.setItem('aa_accessibility_preferences', JSON.stringify(data.preferences.accessibility))
    localStorage.setItem('aa_sobriety_data', JSON.stringify(data.recovery.sobriety))
    localStorage.setItem('aa_daily_checkins', JSON.stringify(data.recovery.checkIns))
    localStorage.setItem('aa_recovery_goals', JSON.stringify(data.recovery.goals))
    // ... apply all other data
    
    localStorage.setItem(this.STORAGE_KEYS.lastSync, new Date().toISOString())
  }

  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates }
    this.notifyObservers()
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => {
      try {
        callback(this.syncStatus)
      } catch (error) {
        console.error('Sync observer error:', error)
      }
    })
  }
}

export default new SyncService()