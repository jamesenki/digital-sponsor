/**
 * Simplified Client-side Encryption Utilities
 * Provides secure encryption for sensitive data like step work entries
 */

import { webcrypto } from 'node:crypto';

// Use Web Crypto API (available in Node.js 16+)
const crypto = webcrypto as unknown as Crypto;

export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt for key derivation
  algorithm: string; // Encryption algorithm used
}

/**
 * Generate a cryptographically secure random password
 */
export function generateSecurePassword(length = 32): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyz' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    '0123456789' +
    '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  return Array.from(array, byte => charset[byte % charset.length]).join('');
}

/**
 * Encrypt data with password-based encryption
 */
export async function encryptData(
  plaintext: string,
  password: string
): Promise<EncryptedData> {
  try {
    // Generate salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encode password
    const passwordBuffer = new TextEncoder().encode(password);

    // Import password key
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive encryption key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt']
    );

    // Encrypt data
    const plaintextBuffer = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      plaintextBuffer
    );

    return {
      data: bufferToBase64(ciphertext),
      iv: bufferToBase64(iv.buffer),
      salt: bufferToBase64(salt.buffer),
      algorithm: 'AES-GCM-PBKDF2',
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${String(error)}`);
  }
}

/**
 * Decrypt data with password-based encryption
 */
export async function decryptData(
  encryptedData: EncryptedData,
  password: string
): Promise<string> {
  try {
    // Decode from base64
    const ciphertext = base64ToBuffer(encryptedData.data);
    const iv = new Uint8Array(base64ToBuffer(encryptedData.iv));
    const salt = new Uint8Array(base64ToBuffer(encryptedData.salt));

    // Encode password
    const passwordBuffer = new TextEncoder().encode(password);

    // Import password key
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive decryption key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['decrypt']
    );

    // Decrypt data
    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(plaintextBuffer);
  } catch (error) {
    throw new Error(`Decryption failed: ${String(error)}`);
  }
}

/**
 * Generate a secure hash of data
 */
export async function generateHash(data: string): Promise<string> {
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return bufferToBase64(hashBuffer);
}

/**
 * Step Work specific encryption utilities
 */
export class StepWorkEncryption {
  private userPassword: string;

  constructor(userPassword: string) {
    this.userPassword = userPassword;
  }

  async encryptEntry(entry: {
    step: number;
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }): Promise<EncryptedData> {
    const entryData = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    });

    return encryptData(entryData, this.userPassword);
  }

  async decryptEntry(encryptedData: EncryptedData): Promise<{
    step: number;
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }> {
    const decryptedData = await decryptData(encryptedData, this.userPassword);
    const entry = JSON.parse(decryptedData);

    return {
      ...entry,
      timestamp: new Date(entry.timestamp),
    };
  }
}

/**
 * Session encryption for sensitive data in transit
 */
export class SessionEncryption {
  private sessionKey: CryptoKey | null = null;

  async initializeSession(): Promise<void> {
    this.sessionKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptSessionData(data: string): Promise<{
    data: string;
    iv: string;
  }> {
    if (!this.sessionKey) {
      throw new Error('Session not initialized');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const dataBuffer = new TextEncoder().encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.sessionKey,
      dataBuffer
    );

    return {
      data: bufferToBase64(encrypted),
      iv: bufferToBase64(iv.buffer),
    };
  }

  async decryptSessionData(encryptedData: {
    data: string;
    iv: string;
  }): Promise<string> {
    if (!this.sessionKey) {
      throw new Error('Session not initialized');
    }

    const data = base64ToBuffer(encryptedData.data);
    const iv = new Uint8Array(base64ToBuffer(encryptedData.iv));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.sessionKey,
      data
    );

    return new TextDecoder().decode(decrypted);
  }

  clearSession(): void {
    this.sessionKey = null;
  }
}

/**
 * Utility functions
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}
