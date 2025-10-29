import { useState, useEffect, useCallback } from 'react'
import syncService, { 
  type SyncConfig, 
  type SyncStatus, 
  type ConflictItem 
} from '@/services/syncService'

/**
 * Sync Hook
 * 
 * React hook for managing data synchronization and cloud backup
 */
export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus())
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncService.subscribe((status) => {
      setSyncStatus(status)
    })

    return unsubscribe
  }, [])

  // Initialize sync service
  const initializeSync = useCallback(async (userPassphrase?: string): Promise<boolean> => {
    const success = await syncService.initializeSync(userPassphrase)
    setIsInitialized(success)
    return success
  }, [])

  // Update sync configuration
  const updateConfig = useCallback((config: Partial<SyncConfig>) => {
    syncService.updateConfig(config)
  }, [])

  // Create backup
  const createBackup = useCallback(async (description?: string): Promise<string | null> => {
    return await syncService.createBackup(description)
  }, [])

  // Restore from backup
  const restoreFromBackup = useCallback(async (backupId: string, userPassphrase?: string): Promise<boolean> => {
    return await syncService.restoreFromBackup(backupId, userPassphrase)
  }, [])

  // Perform sync
  const performSync = useCallback(async (): Promise<boolean> => {
    return await syncService.performSync()
  }, [])

  // List backups
  const listBackups = useCallback(async () => {
    return await syncService.listBackups()
  }, [])

  // Delete backup
  const deleteBackup = useCallback(async (backupId: string): Promise<boolean> => {
    return await syncService.deleteBackup(backupId)
  }, [])

  // Export data
  const exportData = useCallback(async (includePersonalData = true): Promise<string> => {
    return await syncService.exportData(includePersonalData)
  }, [])

  // Import data
  const importData = useCallback(async (jsonData: string): Promise<boolean> => {
    return await syncService.importData(jsonData)
  }, [])

  return {
    // State
    syncStatus,
    isInitialized,
    
    // Actions
    initializeSync,
    updateConfig,
    createBackup,
    restoreFromBackup,
    performSync,
    listBackups,
    deleteBackup,
    exportData,
    importData,
    
    // Convenience getters
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.syncInProgress,
    isBackingUp: syncStatus.backupInProgress,
    hasConflicts: syncStatus.hasConflicts,
    hasError: !!syncStatus.errorMessage,
    lastSync: syncStatus.lastSync,
    lastBackup: syncStatus.lastBackup
  }
}