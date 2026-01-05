/**
 * Digital Sponsor Health Service
 * Minimal microservice with zero external dependencies
 */

module.exports = async function (context, req) {
    const startTime = Date.now();
    
    try {
        // Basic health check - no external dependencies
        const health = {
            status: 'healthy',
            service: 'health-service',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            node_version: process.version,
            environment: process.env.NODE_ENV || 'development'
        };

        const responseTime = Date.now() - startTime;
        
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Response-Time': `${responseTime}ms`
            },
            body: JSON.stringify(health, null, 2)
        };
        
        // Simple console logging (no Winston dependency)
        console.log(`Health check completed in ${responseTime}ms`);
        
    } catch (error) {
        console.error('Health check failed:', error.message);
        
        context.res = {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'unhealthy',
                service: 'health-service',
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};