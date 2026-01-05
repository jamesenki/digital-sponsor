/**
 * Digital Sponsor Authentication Service V2
 * Ultra-lightweight service using Azure Function App Authentication (EasyAuth)
 * Zero external dependencies - relies on Azure's native authentication
 */

module.exports = async function (context, req) {
    const startTime = Date.now();
    const requestId = context.invocationId;

    try {
        console.log('Processing authentication validation request', { requestId });

        // Azure Function App Authentication (EasyAuth) automatically validates tokens
        // When enabled, authenticated requests have user info in headers
        const authHeaders = {
            clientPrincipal: req.headers['x-ms-client-principal'],
            clientPrincipalId: req.headers['x-ms-client-principal-id'],
            clientPrincipalName: req.headers['x-ms-client-principal-name'],
            tokenExpiration: req.headers['x-ms-token-expires-on']
        };

        // Check if user is authenticated via EasyAuth
        const isAuthenticated = !!authHeaders.clientPrincipalId;
        
        let userInfo = null;
        if (isAuthenticated && authHeaders.clientPrincipal) {
            // Decode the base64-encoded client principal
            try {
                const decodedPrincipal = Buffer.from(authHeaders.clientPrincipal, 'base64').toString('utf-8');
                userInfo = JSON.parse(decodedPrincipal);
            } catch (decodeError) {
                console.warn('Failed to decode client principal', { requestId, error: decodeError.message });
            }
        }

        const responseTime = Date.now() - startTime;

        if (isAuthenticated) {
            console.log('User authenticated successfully', { 
                requestId, 
                userId: authHeaders.clientPrincipalId,
                userName: authHeaders.clientPrincipalName
            });

            context.res = {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Response-Time': `${responseTime}ms`
                },
                body: JSON.stringify({
                    authenticated: true,
                    service: 'auth-service-v2',
                    user: {
                        id: authHeaders.clientPrincipalId,
                        name: authHeaders.clientPrincipalName,
                        expires: authHeaders.tokenExpiration,
                        details: userInfo
                    },
                    validatedAt: new Date().toISOString(),
                    responseTime: `${responseTime}ms`,
                    requestId
                })
            };
        } else {
            console.log('User not authenticated', { requestId });
            
            context.res = {
                status: 401,
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Response-Time': `${responseTime}ms`
                },
                body: JSON.stringify({
                    authenticated: false,
                    service: 'auth-service-v2',
                    error: 'User not authenticated via Azure AD B2C',
                    message: 'Please authenticate via the Azure Function App Authentication flow',
                    validatedAt: new Date().toISOString(),
                    responseTime: `${responseTime}ms`,
                    requestId
                })
            };
        }

    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error('Authentication validation failed:', error.message, { requestId, error: error.stack });

        context.res = {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'X-Response-Time': `${responseTime}ms`
            },
            body: JSON.stringify({
                authenticated: false,
                service: 'auth-service-v2',
                error: 'Internal server error during authentication validation',
                validatedAt: new Date().toISOString(),
                responseTime: `${responseTime}ms`,
                requestId
            })
        };
    }
};