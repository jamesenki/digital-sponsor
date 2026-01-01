/**
 * MSAL Configuration for Azure AD B2C
 * Provides type-safe configuration for Microsoft Authentication Library
 */

import {
  Configuration,
  PublicClientApplication,
  LogLevel,
} from '@azure/msal-browser';

export interface B2CUserFlows {
  signUpSignIn: string;
  editProfile: string;
  resetPassword: string;
}

export interface B2CApiScopes {
  stepWorkRead: string;
  stepWorkWrite: string;
  meetingsRead: string;
  chatParticipate: string;
  crisisAccess: string;
}

export interface B2CConfiguration {
  tenantName: string;
  tenantDomain: string;
  clientId: string;
  userFlows: B2CUserFlows;
  apiScopes: B2CApiScopes;
  redirectUri: string;
  postLogoutRedirectUri: string;
}

/**
 * Environment-specific B2C configuration
 */
export const getB2CConfig = (
  environment: 'dev' | 'staging' | 'prod' = 'dev'
): B2CConfiguration => {
  const configs = {
    dev: {
      tenantName: 'digitalsponsordev',
      tenantDomain: 'digitalsponsordev.onmicrosoft.com',
      clientId:
        process.env.REACT_APP_B2C_CLIENT_ID || '[REPLACE_WITH_DEV_CLIENT_ID]',
      redirectUri: 'http://localhost:3000',
      postLogoutRedirectUri: 'http://localhost:3000',
    },
    staging: {
      tenantName: 'digitalsponsorstaging',
      tenantDomain: 'digitalsponsorstaging.onmicrosoft.com',
      clientId:
        process.env.REACT_APP_B2C_CLIENT_ID ||
        '[REPLACE_WITH_STAGING_CLIENT_ID]',
      redirectUri: 'https://staging.digitalsponsor.app',
      postLogoutRedirectUri: 'https://staging.digitalsponsor.app',
    },
    prod: {
      tenantName: 'digitalsponsor',
      tenantDomain: 'digitalsponsor.onmicrosoft.com',
      clientId:
        process.env.REACT_APP_B2C_CLIENT_ID || '[REPLACE_WITH_PROD_CLIENT_ID]',
      redirectUri: 'https://digitalsponsor.app',
      postLogoutRedirectUri: 'https://digitalsponsor.app',
    },
  };

  const config = configs[environment];

  return {
    ...config,
    userFlows: {
      signUpSignIn: 'B2C_1_SignUpSignIn',
      editProfile: 'B2C_1_EditProfile',
      resetPassword: 'B2C_1_PasswordReset',
    },
    apiScopes: {
      stepWorkRead: `https://${config.tenantDomain}/digital-sponsor-api-${environment}/step-work.read`,
      stepWorkWrite: `https://${config.tenantDomain}/digital-sponsor-api-${environment}/step-work.write`,
      meetingsRead: `https://${config.tenantDomain}/digital-sponsor-api-${environment}/meetings.read`,
      chatParticipate: `https://${config.tenantDomain}/digital-sponsor-api-${environment}/chat.participate`,
      crisisAccess: `https://${config.tenantDomain}/digital-sponsor-api-${environment}/crisis.access`,
    },
  };
};

/**
 * Create MSAL configuration for the current environment
 */
export const createMSALConfig = (
  environment?: 'dev' | 'staging' | 'prod'
): Configuration => {
  const b2cConfig = getB2CConfig(environment);

  return {
    auth: {
      clientId: b2cConfig.clientId,
      authority: `https://${b2cConfig.tenantDomain}/${b2cConfig.userFlows.signUpSignIn}`,
      knownAuthorities: [b2cConfig.tenantDomain],
      redirectUri: b2cConfig.redirectUri,
      postLogoutRedirectUri: b2cConfig.postLogoutRedirectUri,
      // AA Tradition 11: Support anonymity by not requiring login
      navigateToLoginRequestUrl: false,
    },
    cache: {
      cacheLocation: 'localStorage', // Can be 'sessionStorage' for enhanced privacy
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (
          level: LogLevel,
          message: string,
          containsPii: boolean
        ) => {
          if (containsPii) {
            return; // Don't log PII for AA anonymity compliance
          }

          switch (level) {
            case LogLevel.Error:
              // eslint-disable-next-line no-console
              console.error(message);
              break;
            case LogLevel.Warning:
              // eslint-disable-next-line no-console
              console.warn(message);
              break;
            case LogLevel.Info:
              // eslint-disable-next-line no-console
              console.info(message);
              break;
            case LogLevel.Verbose:
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.debug(message);
              }
              break;
          }
        },
        piiLoggingEnabled: false, // AA Tradition 11: No PII logging
        logLevel:
          process.env.NODE_ENV === 'development'
            ? LogLevel.Verbose
            : LogLevel.Error,
      },
      allowNativeBroker: false,
      windowHashTimeout: 60000,
      iframeHashTimeout: 6000,
      loadFrameTimeout: 0,
    },
  };
};

/**
 * Create MSAL instance
 */
export const createMSALInstance = (
  environment?: 'dev' | 'staging' | 'prod'
): PublicClientApplication => {
  const config = createMSALConfig(environment);
  return new PublicClientApplication(config);
};

/**
 * Login request configuration
 */
export const createLoginRequest = (
  environment?: 'dev' | 'staging' | 'prod'
) => {
  const b2cConfig = getB2CConfig(environment);

  return {
    scopes: ['openid', 'profile', 'email'],
    redirectUri: b2cConfig.redirectUri,
    // Extra query parameters for AA compliance
    extraQueryParameters: {
      // Prompt for consent to ensure users understand data usage
      prompt: 'consent',
      // Custom parameter to indicate AA-compliant application
      aa_traditions_compliant: 'true',
    },
    // Claims to request in ID token
    claims: JSON.stringify({
      id_token: {
        anonymousMode: { essential: false },
        preferredName: { essential: false },
        sobrietyDate: { essential: false },
        homeMeetingId: { essential: false },
        crisisContactConsent: { essential: true },
        dataRetentionChoice: { essential: false },
      },
    }),
  };
};

/**
 * Logout request configuration
 */
export const createLogoutRequest = (
  environment?: 'dev' | 'staging' | 'prod'
) => {
  const b2cConfig = getB2CConfig(environment);

  return {
    postLogoutRedirectUri: b2cConfig.postLogoutRedirectUri,
    // AA Tradition 11: Clear all local data on logout for anonymity
    account: null,
    mainWindowRedirectUri: b2cConfig.postLogoutRedirectUri,
  };
};

/**
 * API call request configuration
 */
export const createApiRequest = (
  scope: keyof B2CApiScopes,
  environment?: 'dev' | 'staging' | 'prod'
) => {
  const b2cConfig = getB2CConfig(environment);

  return {
    scopes: [b2cConfig.apiScopes[scope]],
    account: null, // Will be set when making the request
  };
};

/**
 * Profile editing request configuration
 */
export const createEditProfileRequest = (
  environment?: 'dev' | 'staging' | 'prod'
) => {
  const b2cConfig = getB2CConfig(environment);

  return {
    authority: `https://${b2cConfig.tenantDomain}/${b2cConfig.userFlows.editProfile}`,
    scopes: ['openid', 'profile'],
    redirectUri: b2cConfig.redirectUri,
  };
};

/**
 * Password reset request configuration
 */
export const createPasswordResetRequest = (
  environment?: 'dev' | 'staging' | 'prod'
) => {
  const b2cConfig = getB2CConfig(environment);

  return {
    authority: `https://${b2cConfig.tenantDomain}/${b2cConfig.userFlows.resetPassword}`,
    scopes: ['openid'],
    redirectUri: b2cConfig.redirectUri,
  };
};

/**
 * AA Traditions compliance utilities
 */
export const AAComplianceUtils = {
  /**
   * Check if anonymous mode is enabled for the user
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isAnonymousModeEnabled: (idTokenClaims: any): boolean => {
    return idTokenClaims?.anonymousMode === true;
  },

  /**
   * Get user's preferred display name (AA Tradition 11 compliant)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPreferredDisplayName: (idTokenClaims: any): string => {
    if (AAComplianceUtils.isAnonymousModeEnabled(idTokenClaims)) {
      return idTokenClaims?.preferredName || 'Anonymous';
    }
    return idTokenClaims?.given_name || 'User';
  },

  /**
   * Check if user has consented to crisis support contact
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hasCrisisContactConsent: (idTokenClaims: any): boolean => {
    return idTokenClaims?.crisisContactConsent === true;
  },

  /**
   * Get user's data retention preference
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDataRetentionChoice: (idTokenClaims: any): string => {
    return idTokenClaims?.dataRetentionChoice || 'session';
  },

  /**
   * Sanitize user data for AA compliance
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sanitizeUserData: (userData: any): any => {
    if (AAComplianceUtils.isAnonymousModeEnabled(userData)) {
      return {
        ...userData,
        // Remove identifying information in anonymous mode
        family_name: undefined,
        surname: undefined,
        // Keep only essential fields
        given_name:
          userData.preferredName || userData.given_name?.split(' ')[0],
        email: userData.email ? 'anonymous@example.com' : undefined,
      };
    }
    return userData;
  },
};

/**
 * Error handler for MSAL operations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleMSALError = (
  error: any
): { message: string; isUserCancelled: boolean } => {
  // User cancelled authentication
  if (
    error.errorCode === 'user_cancelled' ||
    error.message?.includes('AADB2C90091')
  ) {
    return {
      message: 'Authentication was cancelled. Please try again.',
      isUserCancelled: true,
    };
  }

  // Password reset required
  if (error.message?.includes('AADB2C90118')) {
    return {
      message: 'Password reset is required. Please reset your password.',
      isUserCancelled: false,
    };
  }

  // Account not found
  if (error.message?.includes('AADB2C90087')) {
    return {
      message: 'Account not found. Please sign up first.',
      isUserCancelled: false,
    };
  }

  // Generic error
  return {
    message: 'Authentication failed. Please try again.',
    isUserCancelled: false,
  };
};
