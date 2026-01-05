/**
 * Digital Sponsor Token Validation Service
 * Microservice focused solely on JWT token validation
 * Dependencies: jsonwebtoken, jwks-client only
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-client');

// Configuration from environment variables
const config = {
    b2cTenantName: process.env.B2C_TENANT_NAME || 'digitalsponsor',
    b2cTenantDomain: process.env.B2C_TENANT_DOMAIN || 'digitalsponsor.onmicrosoft.com',
    b2cPolicyName: process.env.B2C_POLICY_NAME || 'B2C_1_SignUpSignIn',
    jwtSecret: process.env.JWT_SECRET || 'temp-secret-key-for-testing',
    nodeEnv: process.env.NODE_ENV || 'development'
};

// Derived configuration
const b2cIssuer = `https://${config.b2cTenantDomain}/v2.0/`;
const b2cJwksUri = `https://${config.b2cTenantName}.b2clogin.com/${config.b2cTenantDomain}/discovery/v2.0/keys?p=${config.b2cPolicyName}`;

// Initialize JWKS client for B2C token validation
const jwksClientInstance = jwksClient({
    jwksUri: b2cJwksUri,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000
});

/**
 * Get signing key from JWKS
 */
async function getKey(header, callback) {
    try {
        const key = await jwksClientInstance.getSigningKey(header.kid);
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    } catch (error) {
        console.error('Failed to get signing key:', error);
        callback(error);
    }
}

/**
 * Validate B2C JWT token
 */
function validateB2CToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, getKey, {
            audience: process.env.B2C_CLIENT_ID,
            issuer: b2cIssuer,
            algorithms: ['RS256']
        }, (err, decoded) => {
            if (err) {
                reject(new Error(`B2C token validation failed: ${err.message}`));
            } else {
                resolve(decoded);
            }
        });
    });
}

/**
 * Validate Digital Sponsor internal JWT token
 */
function validateInternalToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, config.jwtSecret, {
            issuer: 'digital-sponsor-auth',
            algorithms: ['HS256']
        }, (err, decoded) => {
            if (err) {
                reject(new Error(`Internal token validation failed: ${err.message}`));
            } else {
                resolve(decoded);
            }
        });
    });
}

/**
 * Main function handler
 */
module.exports = async function (context, req) {
    const startTime = Date.now();
    const requestId = context.invocationId;

    try {
        console.log('Processing token validation request', { requestId });

        // Get token from request
        let token;
        const authHeader = req.headers.authorization || req.headers.Authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.body && req.body.token) {
            token = req.body.token;
        }

        if (!token) {
            console.warn('No token provided', { requestId });
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    valid: false,
                    error: 'No token provided',
                    service: 'token-service',
                    requestId
                })
            };
            return;
        }

        // Determine token type (B2C or internal)
        const tokenType = req.body?.type || 'internal';
        let validationResult;

        if (tokenType === 'b2c') {
            // Validate B2C token
            validationResult = await validateB2CToken(token);
            console.log('B2C token validated successfully', { 
                requestId, 
                subject: validationResult.sub,
                issuer: validationResult.iss
            });
        } else {
            // Validate internal token
            validationResult = await validateInternalToken(token);
            console.log('Internal token validated successfully', { 
                requestId, 
                userId: validationResult.userId,
                sessionId: validationResult.sessionId
            });
        }

        const responseTime = Date.now() - startTime;

        context.res = {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'X-Response-Time': `${responseTime}ms`
            },
            body: JSON.stringify({
                valid: true,
                service: 'token-service',
                tokenType,
                payload: {
                    ...validationResult,
                    // Remove sensitive information
                    iat: validationResult.iat,
                    exp: validationResult.exp,
                    iss: validationResult.iss,
                    aud: validationResult.aud
                },
                validatedAt: new Date().toISOString(),
                responseTime: `${responseTime}ms`,
                requestId
            })
        };

    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error('Token validation failed:', error.message, { requestId, error: error.stack });

        context.res = {
            status: 401,
            headers: { 
                'Content-Type': 'application/json',
                'X-Response-Time': `${responseTime}ms`
            },
            body: JSON.stringify({
                valid: false,
                service: 'token-service',
                error: error.message,
                validatedAt: new Date().toISOString(),
                responseTime: `${responseTime}ms`,
                requestId
            })
        };
    }
};