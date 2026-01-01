/**
 * MSAL Configuration Tests
 */

import {
  getB2CConfig,
  createMSALConfig,
  createLoginRequest,
  createApiRequest,
  AAComplianceUtils,
  handleMSALError,
} from '../utils/msal-config';

// Mock MSAL browser module since it requires browser environment
jest.mock('@azure/msal-browser', () => ({
  LogLevel: {
    Error: 1,
    Warning: 2,
    Info: 3,
    Verbose: 4,
  },
  PublicClientApplication: jest.fn(),
}));

describe('MSAL Configuration', () => {
  describe('getB2CConfig', () => {
    it('should return dev configuration by default', () => {
      const config = getB2CConfig();

      expect(config.tenantName).toBe('digitalsponsordev');
      expect(config.tenantDomain).toBe('digitalsponsordev.onmicrosoft.com');
      expect(config.redirectUri).toBe('http://localhost:3000');
    });

    it('should return staging configuration', () => {
      const config = getB2CConfig('staging');

      expect(config.tenantName).toBe('digitalsponsorstaging');
      expect(config.tenantDomain).toBe('digitalsponsorstaging.onmicrosoft.com');
      expect(config.redirectUri).toBe('https://staging.digitalsponsor.app');
    });

    it('should return production configuration', () => {
      const config = getB2CConfig('prod');

      expect(config.tenantName).toBe('digitalsponsor');
      expect(config.tenantDomain).toBe('digitalsponsor.onmicrosoft.com');
      expect(config.redirectUri).toBe('https://digitalsponsor.app');
    });

    it('should include all required user flows', () => {
      const config = getB2CConfig();

      expect(config.userFlows).toEqual({
        signUpSignIn: 'B2C_1_SignUpSignIn',
        editProfile: 'B2C_1_EditProfile',
        resetPassword: 'B2C_1_PasswordReset',
      });
    });

    it('should include all API scopes with correct format', () => {
      const config = getB2CConfig();

      expect(config.apiScopes.stepWorkRead).toBe(
        'https://digitalsponsordev.onmicrosoft.com/digital-sponsor-api-dev/step-work.read'
      );
      expect(config.apiScopes.stepWorkWrite).toBe(
        'https://digitalsponsordev.onmicrosoft.com/digital-sponsor-api-dev/step-work.write'
      );
      expect(config.apiScopes.meetingsRead).toBe(
        'https://digitalsponsordev.onmicrosoft.com/digital-sponsor-api-dev/meetings.read'
      );
      expect(config.apiScopes.chatParticipate).toBe(
        'https://digitalsponsordev.onmicrosoft.com/digital-sponsor-api-dev/chat.participate'
      );
      expect(config.apiScopes.crisisAccess).toBe(
        'https://digitalsponsordev.onmicrosoft.com/digital-sponsor-api-dev/crisis.access'
      );
    });
  });

  describe('createMSALConfig', () => {
    it('should create valid MSAL configuration', () => {
      const config = createMSALConfig('dev');

      expect(config.auth.authority).toContain(
        'digitalsponsordev.onmicrosoft.com'
      );
      expect(config.auth.authority).toContain('B2C_1_SignUpSignIn');
      expect(config.auth.knownAuthorities).toContain(
        'digitalsponsordev.onmicrosoft.com'
      );
      expect(config.auth.redirectUri).toBe('http://localhost:3000');
    });

    it('should disable PII logging for AA compliance', () => {
      const config = createMSALConfig();

      expect(config.system?.loggerOptions?.piiLoggingEnabled).toBe(false);
    });

    it('should set appropriate log level for environment', () => {
      // Mock environment
      const originalEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = 'development';
      const devConfig = createMSALConfig();
      expect(devConfig.system?.loggerOptions?.logLevel).toBe(4); // Verbose

      process.env.NODE_ENV = 'production';
      const prodConfig = createMSALConfig();
      expect(prodConfig.system?.loggerOptions?.logLevel).toBe(1); // Error

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createLoginRequest', () => {
    it('should include required scopes', () => {
      const request = createLoginRequest();

      expect(request.scopes).toContain('openid');
      expect(request.scopes).toContain('profile');
      expect(request.scopes).toContain('email');
    });

    it('should include AA compliance query parameters', () => {
      const request = createLoginRequest();

      expect(request.extraQueryParameters).toEqual({
        prompt: 'consent',
        aa_traditions_compliant: 'true',
      });
    });

    it('should request AA-specific claims', () => {
      const request = createLoginRequest();

      const claims = JSON.parse(request.claims);
      expect(claims.id_token.anonymousMode).toEqual({ essential: false });
      expect(claims.id_token.preferredName).toEqual({ essential: false });
      expect(claims.id_token.crisisContactConsent).toEqual({ essential: true });
    });
  });

  describe('createApiRequest', () => {
    it('should create request for step work read scope', () => {
      const request = createApiRequest('stepWorkRead');

      expect(request.scopes).toContain(
        'https://digitalsponsordev.onmicrosoft.com/digital-sponsor-api-dev/step-work.read'
      );
    });

    it('should create request for crisis access scope', () => {
      const request = createApiRequest('crisisAccess');

      expect(request.scopes).toContain(
        'https://digitalsponsordev.onmicrosoft.com/digital-sponsor-api-dev/crisis.access'
      );
    });
  });

  describe('AAComplianceUtils', () => {
    const mockIdTokenClaims = {
      anonymousMode: true,
      preferredName: 'John',
      given_name: 'John Doe',
      family_name: 'Doe',
      email: 'john.doe@example.com',
      crisisContactConsent: true,
      dataRetentionChoice: '30days',
    };

    describe('isAnonymousModeEnabled', () => {
      it('should return true when anonymous mode is enabled', () => {
        const result =
          AAComplianceUtils.isAnonymousModeEnabled(mockIdTokenClaims);
        expect(result).toBe(true);
      });

      it('should return false when anonymous mode is disabled', () => {
        const claims = { ...mockIdTokenClaims, anonymousMode: false };
        const result = AAComplianceUtils.isAnonymousModeEnabled(claims);
        expect(result).toBe(false);
      });
    });

    describe('getPreferredDisplayName', () => {
      it('should return preferred name in anonymous mode', () => {
        const result =
          AAComplianceUtils.getPreferredDisplayName(mockIdTokenClaims);
        expect(result).toBe('John');
      });

      it('should return given name when not in anonymous mode', () => {
        const claims = { ...mockIdTokenClaims, anonymousMode: false };
        const result = AAComplianceUtils.getPreferredDisplayName(claims);
        expect(result).toBe('John Doe');
      });

      it('should return Anonymous when no preferred name in anonymous mode', () => {
        const claims = { ...mockIdTokenClaims, preferredName: undefined };
        const result = AAComplianceUtils.getPreferredDisplayName(claims);
        expect(result).toBe('Anonymous');
      });
    });

    describe('hasCrisisContactConsent', () => {
      it('should return true when consent is given', () => {
        const result =
          AAComplianceUtils.hasCrisisContactConsent(mockIdTokenClaims);
        expect(result).toBe(true);
      });

      it('should return false when consent is not given', () => {
        const claims = { ...mockIdTokenClaims, crisisContactConsent: false };
        const result = AAComplianceUtils.hasCrisisContactConsent(claims);
        expect(result).toBe(false);
      });
    });

    describe('getDataRetentionChoice', () => {
      it('should return user choice when set', () => {
        const result =
          AAComplianceUtils.getDataRetentionChoice(mockIdTokenClaims);
        expect(result).toBe('30days');
      });

      it('should return default session when not set', () => {
        const claims = { ...mockIdTokenClaims, dataRetentionChoice: undefined };
        const result = AAComplianceUtils.getDataRetentionChoice(claims);
        expect(result).toBe('session');
      });
    });

    describe('sanitizeUserData', () => {
      it('should remove identifying information in anonymous mode', () => {
        const result = AAComplianceUtils.sanitizeUserData(mockIdTokenClaims);

        expect(result.family_name).toBeUndefined();
        expect(result.surname).toBeUndefined();
        expect(result.email).toBe('anonymous@example.com');
        expect(result.given_name).toBe('John');
      });

      it('should preserve data when not in anonymous mode', () => {
        const claims = { ...mockIdTokenClaims, anonymousMode: false };
        const result = AAComplianceUtils.sanitizeUserData(claims);

        expect(result).toEqual(claims);
      });
    });
  });

  describe('handleMSALError', () => {
    it('should handle user cancelled error', () => {
      const error = { errorCode: 'user_cancelled' };
      const result = handleMSALError(error);

      expect(result.message).toBe(
        'Authentication was cancelled. Please try again.'
      );
      expect(result.isUserCancelled).toBe(true);
    });

    it('should handle password reset error', () => {
      const error = { message: 'AADB2C90118: Password reset required' };
      const result = handleMSALError(error);

      expect(result.message).toBe(
        'Password reset is required. Please reset your password.'
      );
      expect(result.isUserCancelled).toBe(false);
    });

    it('should handle account not found error', () => {
      const error = { message: 'AADB2C90087: Account not found' };
      const result = handleMSALError(error);

      expect(result.message).toBe('Account not found. Please sign up first.');
      expect(result.isUserCancelled).toBe(false);
    });

    it('should handle generic error', () => {
      const error = { message: 'Unknown error occurred' };
      const result = handleMSALError(error);

      expect(result.message).toBe('Authentication failed. Please try again.');
      expect(result.isUserCancelled).toBe(false);
    });
  });
});
