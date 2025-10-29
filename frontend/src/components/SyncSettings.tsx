import React, { useState, useEffect } from 'react'
import { useSync } from '@/hooks/useSync'
import type { SyncConfig } from '@/services/syncService'
import './SyncSettings.css'

interface SyncSettingsProps {
  isOpen: boolean
  onClose: () => void
}

interface BackupItem {
  id: string
  date: Date
  description?: string
  size: number
}

/**
 * Sync Settings Component
 * 
 * Comprehensive data backup and synchronization management with encryption
 */
export default function SyncSettings({ isOpen, onClose }: SyncSettingsProps): JSX.Element {
  const {
    syncStatus,
    isInitialized,
    initializeSync,
    updateConfig,
    createBackup,
    restoreFromBackup,
    performSync,
    listBackups,
    deleteBackup,
    exportData,
    importData
  } = useSync()

  const [config, setConfig] = useState<Partial<SyncConfig>>({
    cloudProvider: 'azure',
    encryptionEnabled: true,
    syncInterval: 60,
    autoSync: false,
    conflictResolution: 'manual',
    retentionDays: 90,
    maxBackups: 10
  })

  const [userPassphrase, setUserPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [restorePassphrase, setRestorePassphrase] = useState('')
  const [backupDescription, setBackupDescription] = useState('')
  const [activeTab, setActiveTab] = useState<'setup' | 'backups' | 'import' | 'advanced'>('setup')
  const [showExportData, setShowExportData] = useState(false)
  const [exportedData, setExportedData] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadBackups()
    }
  }, [isOpen])

  const loadBackups = async () => {
    try {
      const backupList = await listBackups()
      setBackups(backupList)
    } catch (error) {
      console.error('Failed to load backups:', error)
    }
  }

  const handleInitializeSync = async () => {
    if (config.encryptionEnabled && userPassphrase !== confirmPassphrase) {
      alert('Passphrases do not match')
      return
    }

    const success = await initializeSync(config.encryptionEnabled ? userPassphrase : undefined)
    if (success) {
      updateConfig(config)
      alert('Sync initialized successfully!')
    } else {
      alert('Failed to initialize sync')
    }
  }

  const handleCreateBackup = async () => {
    const backupId = await createBackup(backupDescription || undefined)
    if (backupId) {
      setBackupDescription('')
      await loadBackups()
      alert(`Backup created successfully: ${backupId}`)
    } else {
      alert('Failed to create backup')
    }
  }

  const handleRestoreBackup = async () => {
    if (!selectedBackup) {
      alert('Please select a backup to restore')
      return
    }

    const success = await restoreFromBackup(
      selectedBackup, 
      config.encryptionEnabled ? restorePassphrase : undefined
    )
    
    if (success) {
      setRestorePassphrase('')
      setSelectedBackup(null)
      alert('Backup restored successfully!')
    } else {
      alert('Failed to restore backup')
    }
  }

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return
    }

    const success = await deleteBackup(backupId)
    if (success) {
      await loadBackups()
      if (selectedBackup === backupId) {
        setSelectedBackup(null)
      }
    } else {
      alert('Failed to delete backup')
    }
  }

  const handleExportData = async (includePersonalData: boolean) => {
    try {
      const data = await exportData(includePersonalData)
      setExportedData(data)
      setShowExportData(true)
    } catch (error) {
      alert('Failed to export data')
    }
  }

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const success = await importData(text)
      if (success) {
        alert('Data imported successfully!')
      } else {
        alert('Failed to import data')
      }
    } catch (error) {
      alert('Failed to read import file')
    }
  }

  const downloadExportedData = () => {
    const blob = new Blob([exportedData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `digital-sponsor-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Never'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return <></>

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sync-settings-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="sync-settings-title">
        <div className="modal-header">
          <h3 id="sync-settings-title">☁️ Sync & Backup Settings</h3>
          <button 
            onClick={onClose} 
            className="close-button"
            aria-label="Close sync settings"
          >
            ✕
          </button>
        </div>

        {/* Status Bar */}
        <div className="sync-status-bar">
          <div className="status-item">
            <span className={`status-indicator ${syncStatus.isOnline ? 'online' : 'offline'}`}>
              {syncStatus.isOnline ? '🟢' : '🔴'}
            </span>
            <span>{syncStatus.isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div className="status-item">
            <span>🔄 Last Sync:</span>
            <span>{formatLastSync(syncStatus.lastSync)}</span>
          </div>
          {syncStatus.errorMessage && (
            <div className="status-item error">
              <span>⚠️ Error:</span>
              <span>{syncStatus.errorMessage}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            onClick={() => setActiveTab('setup')}
            className={`tab-button ${activeTab === 'setup' ? 'active' : ''}`}
          >
            🛠️ Setup
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`tab-button ${activeTab === 'backups' ? 'active' : ''}`}
          >
            💾 Backups ({backups.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
          >
            📥 Import/Export
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
          >
            ⚙️ Advanced
          </button>
        </div>

        <div className="modal-content">
          {/* Setup Tab */}
          {activeTab === 'setup' && (
            <div className="setup-content">
              <div className="setup-section">
                <h4>🔐 Encryption Setup</h4>
                <p className="section-description">
                  Your recovery data can be encrypted before backup to ensure complete privacy.
                  Choose a strong passphrase that you can remember - it cannot be recovered if lost.
                </p>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.encryptionEnabled}
                    onChange={(e) => setConfig(prev => ({ ...prev, encryptionEnabled: e.target.checked }))}
                  />
                  Enable encryption (recommended)
                </label>

                {config.encryptionEnabled && (
                  <div className="passphrase-setup">
                    <div className="form-group">
                      <label>Encryption Passphrase:</label>
                      <div className="password-input">
                        <input
                          type={showPassphrase ? 'text' : 'password'}
                          value={userPassphrase}
                          onChange={(e) => setUserPassphrase(e.target.value)}
                          placeholder="Enter a strong passphrase"
                          minLength={8}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassphrase(!showPassphrase)}
                          className="toggle-password"
                        >
                          {showPassphrase ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Confirm Passphrase:</label>
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={confirmPassphrase}
                        onChange={(e) => setConfirmPassphrase(e.target.value)}
                        placeholder="Confirm your passphrase"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="setup-section">
                <h4>☁️ Cloud Provider</h4>
                <select
                  value={config.cloudProvider}
                  onChange={(e) => setConfig(prev => ({ ...prev, cloudProvider: e.target.value as any }))}
                >
                  <option value="azure">Azure Blob Storage</option>
                  <option value="aws">AWS S3</option>
                  <option value="gcp">Google Cloud Storage</option>
                  <option value="custom">Custom Endpoint</option>
                </select>
              </div>

              <div className="setup-section">
                <h4>🔄 Auto Sync</h4>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={config.autoSync}
                    onChange={(e) => setConfig(prev => ({ ...prev, autoSync: e.target.checked }))}
                  />
                  Enable automatic synchronization
                </label>

                {config.autoSync && (
                  <div className="form-group">
                    <label>Sync Interval (minutes):</label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={config.syncInterval}
                      onChange={(e) => setConfig(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={handleInitializeSync}
                className="primary-button setup-button"
                disabled={config.encryptionEnabled && (!userPassphrase || userPassphrase !== confirmPassphrase)}
              >
                {isInitialized ? '🔄 Update Settings' : '🚀 Initialize Sync'}
              </button>
            </div>
          )}

          {/* Backups Tab */}
          {activeTab === 'backups' && (
            <div className="backups-content">
              <div className="backup-actions">
                <div className="create-backup">
                  <h4>📦 Create New Backup</h4>
                  <div className="form-group">
                    <input
                      type="text"
                      value={backupDescription}
                      onChange={(e) => setBackupDescription(e.target.value)}
                      placeholder="Optional description for this backup"
                    />
                  </div>
                  <button 
                    onClick={handleCreateBackup}
                    className="primary-button"
                    disabled={syncStatus.backupInProgress}
                  >
                    {syncStatus.backupInProgress ? '⏳ Creating...' : '💾 Create Backup'}
                  </button>
                </div>

                {isInitialized && (
                  <div className="sync-actions">
                    <button 
                      onClick={performSync}
                      className="secondary-button"
                      disabled={syncStatus.syncInProgress}
                    >
                      {syncStatus.syncInProgress ? '⏳ Syncing...' : '🔄 Sync Now'}
                    </button>
                  </div>
                )}
              </div>

              <div className="backup-list">
                <h4>📚 Available Backups</h4>
                {backups.length === 0 ? (
                  <div className="no-backups">
                    <p>No backups found. Create your first backup above.</p>
                  </div>
                ) : (
                  <div className="backup-grid">
                    {backups.map(backup => (
                      <div 
                        key={backup.id}
                        className={`backup-item ${selectedBackup === backup.id ? 'selected' : ''}`}
                        onClick={() => setSelectedBackup(backup.id)}
                      >
                        <div className="backup-header">
                          <span className="backup-date">
                            {backup.date.toLocaleDateString()} {backup.date.toLocaleTimeString()}
                          </span>
                          <span className="backup-size">{formatBytes(backup.size)}</span>
                        </div>
                        {backup.description && (
                          <div className="backup-description">{backup.description}</div>
                        )}
                        <div className="backup-actions">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedBackup(backup.id)
                            }}
                            className="restore-button"
                          >
                            📥 Select
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteBackup(backup.id)
                            }}
                            className="delete-button"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedBackup && (
                  <div className="restore-section">
                    <h4>🔄 Restore Backup</h4>
                    {config.encryptionEnabled && (
                      <div className="form-group">
                        <label>Encryption Passphrase:</label>
                        <input
                          type="password"
                          value={restorePassphrase}
                          onChange={(e) => setRestorePassphrase(e.target.value)}
                          placeholder="Enter your encryption passphrase"
                        />
                      </div>
                    )}
                    <div className="restore-actions">
                      <button 
                        onClick={handleRestoreBackup}
                        className="primary-button"
                        disabled={config.encryptionEnabled && !restorePassphrase}
                      >
                        📥 Restore Selected Backup
                      </button>
                      <button 
                        onClick={() => setSelectedBackup(null)}
                        className="secondary-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import/Export Tab */}
          {activeTab === 'import' && (
            <div className="import-export-content">
              <div className="export-section">
                <h4>📤 Export Data</h4>
                <p>Download your recovery data as a JSON file for manual backup or transfer.</p>
                
                <div className="export-actions">
                  <button 
                    onClick={() => handleExportData(true)}
                    className="secondary-button"
                  >
                    📋 Export All Data
                  </button>
                  <button 
                    onClick={() => handleExportData(false)}
                    className="secondary-button"
                  >
                    🔒 Export (No Personal Data)
                  </button>
                </div>

                {showExportData && (
                  <div className="export-result">
                    <div className="export-actions">
                      <button onClick={downloadExportedData} className="primary-button">
                        💾 Download JSON File
                      </button>
                      <button 
                        onClick={() => setShowExportData(false)}
                        className="secondary-button"
                      >
                        Close
                      </button>
                    </div>
                    <textarea
                      value={exportedData}
                      readOnly
                      className="export-data"
                      rows={10}
                    />
                  </div>
                )}
              </div>

              <div className="import-section">
                <h4>📥 Import Data</h4>
                <p>Upload a previously exported JSON file to restore your data.</p>
                
                <div className="import-actions">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="file-input"
                    id="import-file"
                  />
                  <label htmlFor="import-file" className="file-input-label">
                    📁 Choose JSON File
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="advanced-content">
              <div className="advanced-section">
                <h4>⚙️ Conflict Resolution</h4>
                <select
                  value={config.conflictResolution}
                  onChange={(e) => setConfig(prev => ({ ...prev, conflictResolution: e.target.value as any }))}
                >
                  <option value="manual">Manual resolution</option>
                  <option value="local">Prefer local data</option>
                  <option value="remote">Prefer remote data</option>
                  <option value="merge">Smart merge</option>
                </select>
              </div>

              <div className="advanced-section">
                <h4>🗄️ Retention Settings</h4>
                <div className="form-group">
                  <label>Keep backups for (days):</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={config.retentionDays}
                    onChange={(e) => setConfig(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <label>Maximum backups to keep:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={config.maxBackups}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxBackups: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="advanced-section">
                <h4>ℹ️ Technical Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span>Device ID:</span>
                    <span className="monospace">{syncStatus.isOnline ? 'Connected' : 'Offline'}</span>
                  </div>
                  <div className="info-item">
                    <span>Encryption:</span>
                    <span>{config.encryptionEnabled ? '🔐 Enabled' : '🔓 Disabled'}</span>
                  </div>
                  <div className="info-item">
                    <span>Pending Changes:</span>
                    <span>{syncStatus.pendingChanges}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="privacy-notice">
            <h5>🔒 Privacy & Security</h5>
            <ul>
              <li>All data remains anonymous - no personal identifiers are stored</li>
              <li>Encryption uses AES-256 with your passphrase as the key</li>
              <li>Your passphrase never leaves your device</li>
              <li>Cloud storage is used only for encrypted backup blobs</li>
              <li>You control all aspects of backup and synchronization</li>
            </ul>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="primary-button">
            ✅ Close
          </button>
        </div>
      </div>
    </div>
  )
}