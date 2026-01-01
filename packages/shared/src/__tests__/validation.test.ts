/**
 * Validation Schema Tests
 */

import { v4 as uuidv4 } from 'uuid';

import { validate } from '../validation/schemas';

describe('Validation Schemas', () => {
  describe('chatMessage validation', () => {
    it('should validate a valid chat message', () => {
      const validMessage = {
        id: uuidv4(),
        userId: uuidv4(),
        message: 'Hello, how can I help with step work today?',
        timestamp: new Date(),
        type: 'user',
        sessionId: uuidv4(),
        metadata: { source: 'web' },
      };

      const result = validate.chatMessage(validMessage);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validMessage);
    });

    it('should reject invalid message type', () => {
      const invalidMessage = {
        id: uuidv4(),
        message: 'Hello',
        timestamp: new Date(),
        type: 'invalid_type',
        sessionId: uuidv4(),
      };

      const result = validate.chatMessage(invalidMessage);
      expect(result.error).toBeDefined();
      expect(result.error?.details[0].message).toContain(
        '"type" must be one of'
      );
    });

    it('should reject message that is too long', () => {
      const longMessage = {
        id: uuidv4(),
        message: 'a'.repeat(4001),
        timestamp: new Date(),
        type: 'user',
        sessionId: uuidv4(),
      };

      const result = validate.chatMessage(longMessage);
      expect(result.error).toBeDefined();
      expect(result.error?.details[0].message).toContain(
        'length must be less than or equal to 4000'
      );
    });
  });

  describe('stepWorkEntry validation', () => {
    it('should validate a valid step work entry', () => {
      const validEntry = {
        id: uuidv4(),
        userId: uuidv4(),
        step: 4,
        title: 'My Resentments',
        content: 'Working through my resentments list...',
        isPrivate: true,
        tags: ['resentments', 'step4'],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        encryptionInfo: {
          isEncrypted: true,
          algorithm: 'AES-GCM',
          keyId: 'key123',
        },
      };

      const result = validate.stepWorkEntry(validEntry);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validEntry);
    });

    it('should reject invalid step number', () => {
      const invalidEntry = {
        id: uuidv4(),
        userId: uuidv4(),
        step: 13, // Invalid step number
        title: 'Test',
        content: 'Content',
        isPrivate: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const result = validate.stepWorkEntry(invalidEntry);
      expect(result.error).toBeDefined();
      expect(result.error?.details[0].message).toContain(
        'must be less than or equal to 12'
      );
    });
  });

  describe('crisisSupportRequest validation', () => {
    it('should validate a valid crisis support request', () => {
      const validRequest = {
        sessionId: uuidv4(),
        type: 'suicidal_thoughts',
        severity: 'high',
        location: {
          country: 'US',
          state: 'CA',
          city: 'San Francisco',
          zipCode: '94102',
        },
        contactPreference: 'hotline',
        timestamp: new Date(),
      };

      const result = validate.crisisSupportRequest(validRequest);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validRequest);
    });

    it('should reject invalid crisis type', () => {
      const invalidRequest = {
        sessionId: uuidv4(),
        type: 'invalid_crisis_type',
        severity: 'high',
        contactPreference: 'hotline',
        timestamp: new Date(),
      };

      const result = validate.crisisSupportRequest(invalidRequest);
      expect(result.error).toBeDefined();
      expect(result.error?.details[0].message).toContain(
        '"type" must be one of'
      );
    });
  });

  describe('userPreferences validation', () => {
    it('should validate valid user preferences', () => {
      const validPreferences = {
        accessibility: {
          theme: 'dark',
          fontSize: 'large',
          highContrast: true,
          reducedMotion: false,
          screenReader: true,
          keyboardNavigation: true,
        },
        privacy: {
          anonymousMode: true,
          dataRetention: '30days',
          shareProgress: false,
          allowAnalytics: false,
        },
        notifications: {
          meetingReminders: true,
          dailyReflection: false,
          stepWorkPrompts: true,
          crisisAlerts: true,
        },
        stepWork: {
          autoSave: true,
          encryptionEnabled: true,
          backupEnabled: false,
          reminderFrequency: 'weekly',
        },
      };

      const result = validate.userPreferences(validPreferences);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validPreferences);
    });

    it('should apply default values for missing fields', () => {
      const minimalPreferences = {
        accessibility: {},
        privacy: {},
      };

      const result = validate.userPreferences(minimalPreferences);
      expect(result.error).toBeUndefined();
      expect(result.value.accessibility.theme).toBe('system');
      expect(result.value.accessibility.fontSize).toBe('medium');
      expect(result.value.privacy.anonymousMode).toBe(true);
    });
  });

  describe('meeting validation', () => {
    it('should validate a valid meeting', () => {
      const validMeeting = {
        id: uuidv4(),
        name: 'Tuesday Night Big Book Study',
        type: 'closed',
        dayOfWeek: 2,
        time: '19:30',
        duration: 90,
        location: {
          name: 'Community Center',
          address: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          coordinates: {
            lat: 37.7749,
            lng: -122.4194,
          },
        },
        contact: {
          phone: '(555) 123-4567',
          email: 'contact@meeting.org',
        },
        accessibility: {
          wheelchairAccessible: true,
          assistiveListening: false,
          signLanguage: false,
        },
        isActive: true,
      };

      const result = validate.meeting(validMeeting);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validMeeting);
    });

    it('should reject invalid day of week', () => {
      const invalidMeeting = {
        id: uuidv4(),
        name: 'Test Meeting',
        type: 'open',
        dayOfWeek: 7, // Invalid day
        time: '19:30',
        location: {
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zipCode: '12345',
        },
        isActive: true,
      };

      const result = validate.meeting(invalidMeeting);
      expect(result.error).toBeDefined();
      expect(result.error?.details[0].message).toContain(
        'must be less than or equal to 6'
      );
    });
  });

  describe('encryptedData validation', () => {
    it('should validate valid encrypted data', () => {
      const validEncryptedData = {
        data: 'dGVzdCBkYXRh', // base64 encoded 'test data'
        iv: 'MTIzNDU2Nzg5MGFiY2RlZg==', // base64 encoded IV
        salt: 'c2FsdDEyMzQ1Njc4OTA=', // base64 encoded salt
        algorithm: 'AES-GCM-PBKDF2',
      };

      const result = validate.encryptedData(validEncryptedData);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(validEncryptedData);
    });

    it('should reject invalid base64 data', () => {
      const invalidEncryptedData = {
        data: 'not-base64!',
        iv: 'MTIzNDU2Nzg5MGFiY2RlZg==',
        salt: 'c2FsdDEyMzQ1Njc4OTA=',
        algorithm: 'AES-GCM-PBKDF2',
      };

      const result = validate.encryptedData(invalidEncryptedData);
      expect(result.error).toBeDefined();
      expect(result.error?.details[0].message).toContain(
        'must be a valid base64 string'
      );
    });
  });
});
