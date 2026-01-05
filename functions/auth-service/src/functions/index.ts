/**
 * Azure Functions Index
 * Exports all authentication functions
 */

// Import all functions to register them
import './auth-login';
import './auth-refresh';
import './auth-logout';
import './auth-validate';
import './health';

// Note: Azure Functions v4 automatically registers functions when imported
// No need for explicit exports in the programming model v4
