/**
 * Digital Sponsor Session Management Service
 * Ultra-lightweight session management using Azure Storage
 * Zero external dependencies - uses built-in Node.js HTTP and crypto
 */

const crypto = require('crypto');

// In-memory session storage for this demo (in production would use Azure Storage)
// This keeps the service ultra-lightweight without external dependencies
const sessions = new Map();

// Helper function to generate session ID
function generateSessionId() {
    return crypto.randomUUID();
}

// Helper function to validate session expiry
function isSessionValid(session) {
    return session && new Date(session.expiresAt) > new Date();
}

// Helper function to create session data
function createSession(userId, userData = {}) {
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours
    
    const session = {
        sessionId,
        userId,
        userData,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        lastAccessed: new Date().toISOString()
    };
    
    sessions.set(sessionId, session);
    return session;
}

module.exports = async function (context, req) {
    const startTime = Date.now();
    const requestId = context.invocationId;
    const action = req.params.action || 'info';

    try {
        console.log('Processing session management request', { requestId, action, method: req.method });

        let response;

        switch (action.toLowerCase()) {
            case 'create':
                // POST /api/session/create
                const { userId, userData } = req.body || {};
                if (!userId) {
                    response = { 
                        success: false, 
                        error: 'userId is required',
                        action: 'create'
                    };
                    context.res.status = 400;
                    break;
                }
                
                const newSession = createSession(userId, userData);
                response = {
                    success: true,
                    action: 'create',
                    session: {
                        sessionId: newSession.sessionId,
                        userId: newSession.userId,
                        expiresAt: newSession.expiresAt
                    }
                };
                context.res.status = 201;
                break;

            case 'get':
                // GET /api/session/get?sessionId=xxx
                const getSessionId = req.query.sessionId || req.body?.sessionId;
                if (!getSessionId) {
                    response = { 
                        success: false, 
                        error: 'sessionId is required',
                        action: 'get'
                    };
                    context.res.status = 400;
                    break;
                }

                const session = sessions.get(getSessionId);
                if (!isSessionValid(session)) {
                    // Clean up expired session
                    if (session) sessions.delete(getSessionId);
                    response = { 
                        success: false, 
                        error: 'Session not found or expired',
                        action: 'get'
                    };
                    context.res.status = 404;
                    break;
                }

                // Update last accessed
                session.lastAccessed = new Date().toISOString();
                response = {
                    success: true,
                    action: 'get',
                    session: {
                        sessionId: session.sessionId,
                        userId: session.userId,
                        userData: session.userData,
                        lastAccessed: session.lastAccessed,
                        expiresAt: session.expiresAt
                    }
                };
                break;

            case 'delete':
                // DELETE /api/session/delete
                const deleteSessionId = req.query.sessionId || req.body?.sessionId;
                if (!deleteSessionId) {
                    response = { 
                        success: false, 
                        error: 'sessionId is required',
                        action: 'delete'
                    };
                    context.res.status = 400;
                    break;
                }

                const deleted = sessions.delete(deleteSessionId);
                response = {
                    success: deleted,
                    action: 'delete',
                    message: deleted ? 'Session deleted successfully' : 'Session not found'
                };
                context.res.status = deleted ? 200 : 404;
                break;

            case 'info':
            default:
                // GET /api/session - Service information
                const activeSessions = Array.from(sessions.values()).filter(s => isSessionValid(s));
                response = {
                    service: 'session-service',
                    version: '1.0.0',
                    status: 'healthy',
                    activeSessionsCount: activeSessions.length,
                    totalSessionsCount: sessions.size,
                    timestamp: new Date().toISOString(),
                    actions: {
                        create: 'POST /api/session/create - Create new session',
                        get: 'GET /api/session/get?sessionId=xxx - Get session data',
                        delete: 'DELETE /api/session/delete - Delete session',
                        info: 'GET /api/session - Service information'
                    }
                };
                break;
        }

        const responseTime = Date.now() - startTime;
        
        context.res = {
            status: context.res.status || 200,
            headers: { 
                'Content-Type': 'application/json',
                'X-Response-Time': `${responseTime}ms`
            },
            body: JSON.stringify({
                ...response,
                responseTime: `${responseTime}ms`,
                requestId
            })
        };

        console.log('Session request completed', { 
            requestId, 
            action, 
            status: context.res.status,
            responseTime: `${responseTime}ms`
        });

    } catch (error) {
        const responseTime = Date.now() - startTime;
        console.error('Session management error:', error.message, { requestId, error: error.stack });

        context.res = {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'X-Response-Time': `${responseTime}ms`
            },
            body: JSON.stringify({
                success: false,
                service: 'session-service',
                error: 'Internal server error during session management',
                responseTime: `${responseTime}ms`,
                requestId
            })
        };
    }
};